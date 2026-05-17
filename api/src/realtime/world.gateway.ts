import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/world', cors: { origin: '*', credentials: true } })
export class WorldGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('join-room')
  joinRoom(@MessageBody() entityId: string, @ConnectedSocket() socket: Socket) {
    socket.join(`world:${entityId}`);
  }

  @SubscribeMessage('leave-room')
  leaveRoom(@MessageBody() entityId: string, @ConnectedSocket() socket: Socket) {
    socket.leave(`world:${entityId}`);
  }

  emit(event: string, entityId: string, payload: unknown) {
    this.server.to(`world:${entityId}`).emit(event, payload);
  }
}
