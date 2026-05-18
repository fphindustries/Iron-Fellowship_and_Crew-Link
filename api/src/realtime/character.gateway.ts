import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/character' })
export class CharacterGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('join-room')
  joinRoom(@MessageBody() entityId: string, @ConnectedSocket() socket: Socket) {
    socket.join(`character:${entityId}`);
  }

  @SubscribeMessage('leave-room')
  leaveRoom(@MessageBody() entityId: string, @ConnectedSocket() socket: Socket) {
    socket.leave(`character:${entityId}`);
  }

  emit(event: string, entityId: string, payload: unknown) {
    this.server.to(`character:${entityId}`).emit(event, payload);
  }
}
