import { Module } from '@nestjs/common';
import { WorldsController } from './worlds.controller';
import { WorldsService } from './worlds.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [WorldsController],
  providers: [WorldsService],
  exports: [WorldsService],
})
export class WorldsModule {}
