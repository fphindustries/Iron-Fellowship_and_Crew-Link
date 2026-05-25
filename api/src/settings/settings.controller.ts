import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@Controller('api/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  // Oracle settings
  @Get('oracle')
  getOracleSettings(@Req() req: any) {
    return this.svc.getOracleSettings((req.user as { id: string }).id);
  }

  @Patch('oracle')
  updateOracleSettings(@Req() req: any, @Body() body: any) {
    return this.svc.updateOracleSettings((req.user as { id: string }).id, body);
  }

  // Accessibility settings
  @Get('accessibility')
  getAccessibilitySettings(@Req() req: any) {
    return this.svc.getAccessibilitySettings((req.user as { id: string }).id);
  }

  @Patch('accessibility')
  updateAccessibilitySettings(@Req() req: any, @Body() body: any) {
    return this.svc.updateAccessibilitySettings(
      (req.user as { id: string }).id,
      body,
    );
  }

  // Custom moves
  @Get('custom-moves')
  getCustomMoves(@Req() req: any) {
    return this.svc.getCustomMoves((req.user as { id: string }).id);
  }

  @Post('custom-moves')
  createCustomMove(@Req() req: any, @Body() body: any) {
    return this.svc.createCustomMove((req.user as { id: string }).id, body);
  }

  @Patch('custom-moves/:id')
  updateCustomMove(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateCustomMove(id, body);
  }

  @Delete('custom-moves/:id')
  deleteCustomMove(@Param('id') id: string) {
    return this.svc.deleteCustomMove(id);
  }

  // Custom oracles
  @Get('custom-oracles')
  getCustomOracles(@Req() req: any) {
    return this.svc.getCustomOracles((req.user as { id: string }).id);
  }

  @Post('custom-oracles')
  createCustomOracle(@Req() req: any, @Body() body: any) {
    return this.svc.createCustomOracle((req.user as { id: string }).id, body);
  }

  @Patch('custom-oracles/:id')
  updateCustomOracle(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateCustomOracle(id, body);
  }

  @Delete('custom-oracles/:id')
  deleteCustomOracle(@Param('id') id: string) {
    return this.svc.deleteCustomOracle(id);
  }

  // Entity settings (per-character/campaign/world settings)
  @Get('entity/:entityType/:entityId')
  getEntitySettings(
    @Req() req: any,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.svc.getEntitySettings(
      (req.user as { id: string }).id,
      entityId,
      entityType,
    );
  }

  @Patch('entity/:entityType/:entityId')
  updateEntitySettings(
    @Req() req: any,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() body: any,
  ) {
    return this.svc.updateEntitySettings(
      (req.user as { id: string }).id,
      entityId,
      entityType,
      body,
    );
  }
}
