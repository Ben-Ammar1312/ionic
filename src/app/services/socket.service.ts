import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({ providedIn:'root' })
export class SocketService {
  private socket!: Socket;
  connect(){ if(!this.socket) this.socket = io(environment.socket, { transports:['websocket'] }); }
  emit(event:string, data:any){ this.socket.emit(event, data); }
  on(event:string, cb:(d:any)=>void){ this.socket.on(event, cb); }
  disconnect(){ this.socket?.disconnect(); this.socket = undefined as any; }
}