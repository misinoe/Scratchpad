#!/usr/share/node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HTTP_PORT = parseInt(process.env['PORT']) || 5000;
if (isNaN(HTTP_PORT)) {
    throw new Error('invalid HTTP_PORT from ENV');
    process.exit(1);
}
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const socket_io_1 = __importDefault(require("socket.io"));
const app = express_1.default();
const httpServer = new http_1.default.Server(app);
const io = socket_io_1.default(httpServer);
httpServer.listen(HTTP_PORT);
app.use(express_1.default.static(path_1.default.join(__dirname, '../static')));
class Room {
    constructor(socketIo) {
        this.dataIndex = 0;
        this.sharedData = {};
        this.maxTime = 18;
        this.time = this.maxTime;
        this.socketMap = new Map();
        this.clear = () => {
            const { socketIo, sharedData } = this;
            const deleteNameList = [];
            for (let name in sharedData) {
                delete sharedData[name];
                deleteNameList.push(name);
            }
            socketIo.emit('delete', deleteNameList);
        };
        this.notifyTimer = () => {
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
        this.clientConnectionHandler = (clientSocket) => {
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
        this.socketIo = socketIo;
        socketIo.on('connection', this.clientConnectionHandler.bind(this));
        this.notifyTimer();
    }
}
const room1 = new Room(io.of('/1'));
const room2 = new Room(io.of('/2'));
const room3 = new Room(io.of('/3'));
