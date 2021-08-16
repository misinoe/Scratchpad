const HTTP_PORT = parseInt(process.env['PORT']) || 5050;
if (isNaN(HTTP_PORT)) {
  throw new Error('invalid HTTP_PORT from ENV');
}

import path from 'path';
import http from 'http';
import express from 'express';
import {Server as SocketIoServer, Namespace, Socket} from 'socket.io';

const app = express();
const httpServer = new http.Server(app);
const socketIoServer = new SocketIoServer(httpServer);

httpServer.listen(HTTP_PORT);

app.use(express.static(path.join(__dirname,  '../static')));

class Room {
  private dataIndex = 0;
  private sharedData = {};

  private maxTime = 18;
  private time = this.maxTime;

  private socketMap = new Map<string, Socket>();
  private socketIo: Namespace;

  constructor(socketIo: Namespace) {
    this.socketIo = socketIo;
    socketIo.on('connection', this.clientConnectionHandler.bind(this));

    this.notifyTimer();
  }

  private clear = () => {
    const {socketIo, sharedData} = this;

    const deleteNameList: string[] = [];
    for (let name in sharedData) {
      delete sharedData[name];
      deleteNameList.push(name);
    }

    socketIo.emit('delete', deleteNameList);
  }

  private notifyTimer = () => {
    const time = this.time --;
    if (time <= 0) {
      this.clear();
      this.time = this.maxTime;
    } else {
      this.socketIo.emit('changed', {name: 't', data: this.time})
    }

    setTimeout(this.notifyTimer, 10000);
  }

  private clientConnectionHandler = (clientSocket: Socket) => {
    const {socketMap, socketIo} = this;
    const {id} = clientSocket;
    if (socketMap.has(id)) {
      clientSocket.disconnect();
      return;
    }
    socketMap.set(id, clientSocket);
    clientSocket.on('disconnect', (reason) => {
      socketMap.delete(id);
      socketIo.emit('changed', {name: 'u', data: socketMap.size});
    });

    clientSocket.on('a', (data) => {
      if (typeof data !== 'string') {
        clientSocket.disconnect();
        return;
      }
      const name = 'a' + (++ this.dataIndex);
      this.sharedData[name] = data;

      socketIo.emit('changed', {name, data});
    });

    const {sharedData} = this;
    for (let name in sharedData) {
      clientSocket.emit('changed', {name, data: sharedData[name]});
    }

    socketIo.emit('changed', {name: 'u', data: socketMap.size});
  }
}

const room1 = new Room(socketIoServer.of('/1'));
const room2 = new Room(socketIoServer.of('/2'));
const room3 = new Room(socketIoServer.of('/3'));
