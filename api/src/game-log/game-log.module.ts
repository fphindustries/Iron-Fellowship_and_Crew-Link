import { Module } from '@nestjs/common';
import { GameLogController } from './game-log.controller';
import { GameLogService } from './game-log.service';

@Module({
  controllers: [GameLogController],
  providers: [GameLogService],
})
export class GameLogModule {}
