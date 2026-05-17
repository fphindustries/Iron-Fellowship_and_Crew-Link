import { Module } from '@nestjs/common';
import { HomebrewController } from './homebrew.controller';
import { HomebrewService } from './homebrew.service';

@Module({
  controllers: [HomebrewController],
  providers: [HomebrewService],
  exports: [HomebrewService],
})
export class HomebrewModule {}
