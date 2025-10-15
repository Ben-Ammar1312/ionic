import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
/**
 * Central place to manage the Socket.IO connection used for real-time alert updates.
 */
export class SocketService {
  private socket?: Socket;

  /**
   * Opens the connection if necessary and returns the active Socket instance.
   * The websocket transport is forced for reliability on mobile devices.
   */
  connect(): Socket {
    if (!this.socket) {
      const transports = ['websocket'];
      this.socket = environment.socket
        ? io(environment.socket, { transports })
        : io({ transports });
    } else if (!this.socket.connected) {
      this.socket.connect();
    }
    return this.socket;
  }

  /**
   * Quick helper for pages that need to check whether they are currently online.
   */
  isConnected(): boolean {
    return !!this.socket?.connected;
  }

  /**
   * Emits an event to the backend if the connection is open.
   */
  emit(event: string, data: unknown): void {
    this.socket?.emit(event, data);
  }

  /**
   * Registers a listener for a specific event.
   */
  on(event: string, cb: (data: unknown) => void): void {
    this.socket?.on(event, cb);
  }

  /**
   * Removes a previously registered listener.
   */
  off(event: string, cb?: (data: unknown) => void): void {
    if (!this.socket) {
      return;
    }
    if (cb) {
      this.socket.off(event, cb);
    } else {
      this.socket.off(event);
    }
  }

  /**
   * Cleanly closes the connection and clears the cached socket reference.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
  }
}
