import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/campaign', cors: { origin: '*', credentials: true } })
export class CampaignGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('join-room')
  joinRoom(@MessageBody() entityId: string, @ConnectedSocket() socket: Socket) {
    socket.join(`campaign:${entityId}`);
  }

  @SubscribeMessage('leave-room')
  leaveRoom(@MessageBody() entityId: string, @ConnectedSocket() socket: Socket) {
    socket.leave(`campaign:${entityId}`);
  }

  emit(event: string, entityId: string, payload: unknown) {
    this.server.to(`campaign:${entityId}`).emit(event, payload);
  }
}
