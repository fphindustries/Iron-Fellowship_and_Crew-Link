import { Module } from '@nestjs/common';
import { CharacterGateway } from './character.gateway';
import { CampaignGateway } from './campaign.gateway';
import { WorldGateway } from './world.gateway';

@Module({
  providers: [CharacterGateway, CampaignGateway, WorldGateway],
  exports: [CharacterGateway, CampaignGateway, WorldGateway],
})
export class RealtimeModule {}
