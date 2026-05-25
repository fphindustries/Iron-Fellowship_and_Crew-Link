import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as Y from 'yjs';
import { YjsService } from './yjs.service';

interface DocRef {
  entityType: string;
  entityId: string;
}

@WebSocketGateway({ namespace: '/yjs' })
export class YjsGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private readonly yjsService: YjsService) {}

  private roomKey(entityType: string, entityId: string) {
    return `${entityType}:${entityId}`;
  }

  @SubscribeMessage('join-document')
  async joinDocument(
    @MessageBody() data: DocRef,
    @ConnectedSocket() socket: Socket,
  ) {
    const room = this.roomKey(data.entityType, data.entityId);
    socket.join(room);

    const state = await this.yjsService.loadState(
      data.entityType,
      data.entityId,
    );
    if (state) {
      socket.emit('sync-step-2', { diff: Array.from(state) });
    }
  }

  @SubscribeMessage('sync-step-1')
  async syncStep1(
    @MessageBody() data: DocRef & { stateVector: number[] },
    @ConnectedSocket() socket: Socket,
  ) {
    const persisted = await this.yjsService.loadState(
      data.entityType,
      data.entityId,
    );
    if (!persisted) return;

    const sv = new Uint8Array(data.stateVector);
    const diff = Y.diffUpdateV2(persisted, sv);
    if (diff.length > 0) {
      socket.emit('sync-step-2', { diff: Array.from(diff) });
    }
  }

  @SubscribeMessage('update')
  async handleUpdate(
    @MessageBody() data: DocRef & { update: number[] },
    @ConnectedSocket() socket: Socket,
  ) {
    const update = new Uint8Array(data.update);
    await this.yjsService.applyUpdate(data.entityType, data.entityId, update);

    const room = this.roomKey(data.entityType, data.entityId);
    socket.to(room).emit('update', { update: data.update });
  }

  handleDisconnect(socket: Socket) {
    // Socket.IO auto-removes from rooms on disconnect
  }
}
