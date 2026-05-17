import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './db/database.module';
import { MailModule } from './common/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CharactersModule } from './characters/characters.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { WorldsModule } from './worlds/worlds.module';
import { HomebrewModule } from './homebrew/homebrew.module';
import { NotesModule } from './notes/notes.module';
import { GameLogModule } from './game-log/game-log.module';
import { SettingsModule } from './settings/settings.module';
import { StorageModule } from './storage/storage.module';
import { AiModule } from './ai/ai.module';
import { RealtimeModule } from './realtime/realtime.module';
import { YjsModule } from './yjs/yjs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
    DatabaseModule,
    MailModule,
    AuthModule,
    UsersModule,
    CharactersModule,
    CampaignsModule,
    WorldsModule,
    HomebrewModule,
    NotesModule,
    GameLogModule,
    SettingsModule,
    StorageModule,
    AiModule,
    RealtimeModule,
    YjsModule,
  ],
})
export class AppModule {}
