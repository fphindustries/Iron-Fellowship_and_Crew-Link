import { Module } from '@nestjs/common';
import { YjsGateway } from './yjs.gateway';
import { YjsService } from './yjs.service';

@Module({
  providers: [YjsGateway, YjsService],
  exports: [YjsService],
})
export class YjsModule {}
