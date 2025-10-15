import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket?: Socket;

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(environment.socket, { transports: ['websocket'] });
    } else if (!this.socket.connected) {
      this.socket.connect();
    }
    return this.socket;
  }

  isConnected(): boolean {
    return !!this.socket?.connected;
  }

  emit(event: string, data: unknown): void {
    this.socket?.emit(event, data);
  }

  on(event: string, cb: (data: any) => void): void {
    this.socket?.on(event, cb);
  }

  off(event: string, cb?: (data: any) => void): void {
    this.socket?.off(event, cb as any);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
  }
}
