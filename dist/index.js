"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HTTP_PORT = parseInt(process.env['PORT']) || 5050;
if (isNaN(HTTP_PORT)) {
    throw new Error('invalid HTTP_PORT from ENV');
}
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const app = express_1.default();
const httpServer = new http_1.default.Server(app);
const socketIoServer = new socket_io_1.Server(httpServer);
httpServer.listen(HTTP_PORT);
app.use(express_1.default.static(path_1.default.join(__dirname, '../static')));
class Room {
    dataIndex = 0;
    sharedData = {};
    maxTime = 18;
    time = this.maxTime;
    socketMap = new Map();
    socketIo;
    constructor(socketIo) {
        this.socketIo = socketIo;
        socketIo.on('connection', this.clientConnectionHandler.bind(this));
        this.notifyTimer();
    }
    clear = () => {
        const { socketIo, sharedData } = this;
        const deleteNameList = [];
        for (let name in sharedData) {
            delete sharedData[name];
            deleteNameList.push(name);
        }
        socketIo.emit('delete', deleteNameList);
    };
    notifyTimer = () => {
        const time = this.time--;
        if (time <= 0) {
            this.clear();
            this.time = this.maxTime;
        }
        else {
            this.socketIo.emit('changed', { name: 't', data: this.time });
        }
        setTimeout(this.notifyTimer, 10000);
    };
    clientConnectionHandler = (clientSocket) => {
        const { socketMap, socketIo } = this;
        const { id } = clientSocket;
        if (socketMap.has(id)) {
            clientSocket.disconnect();
            return;
        }
        socketMap.set(id, clientSocket);
        clientSocket.on('disconnect', (reason) => {
            socketMap.delete(id);
            socketIo.emit('changed', { name: 'u', data: socketMap.size });
        });
        clientSocket.on('a', (data) => {
            if (typeof data !== 'string') {
                clientSocket.disconnect();
                return;
            }
            const name = 'a' + (++this.dataIndex);
            this.sharedData[name] = data;
            socketIo.emit('changed', { name, data });
        });
        const { sharedData } = this;
        for (let name in sharedData) {
            clientSocket.emit('changed', { name, data: sharedData[name] });
        }
        socketIo.emit('changed', { name: 'u', data: socketMap.size });
    };
}
const room1 = new Room(socketIoServer.of('/1'));
const room2 = new Room(socketIoServer.of('/2'));
const room3 = new Room(socketIoServer.of('/3'));
