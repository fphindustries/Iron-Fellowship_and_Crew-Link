import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Generation failed';
}

@Controller('api/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly svc: AiService) {}

  @Post('guide')
  callGuide(@Req() req: any, @Body() body: any) {
    return this.svc.callGuide((req.user as { id: string }).id, body);
  }

  @Get('events')
  getEvents(@Query('campaignId') campaignId: string) {
    return this.svc.getEvents(campaignId);
  }

  @Patch('events/:id')
  updateEventStatus(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateEventStatus(id, body);
  }

  @Post('character/paths')
  recommendPaths(@Body() body: any) {
    return this.svc.recommendPaths(body);
  }

  @Post('character/backstory')
  generateBackstory(@Body() body: any) {
    return this.svc.generateBackstory(body);
  }

  @Post('character/backstory/stream')
  async generateBackstoryStream(@Body() body: any, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    try {
      for await (const event of this.svc.generateBackstoryStream(body)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      const message = getErrorMessage(err);
      console.error('Backstory generation failed:', err);
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('character/vow')
  generateVow(@Body() body: any) {
    return this.svc.generateVow(body);
  }

  @Post('character/vow/stream')
  async generateVowStream(@Body() body: any, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    try {
      for await (const event of this.svc.generateVowStream(body)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      const message = getErrorMessage(err);
      console.error('Vow generation failed:', err);
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('character/asset')
  recommendFinalAsset(@Body() body: any) {
    return this.svc.recommendFinalAsset(body);
  }

  @Post('character/stats')
  recommendStatAllocation(@Body() body: any) {
    return this.svc.recommendStatAllocation(body);
  }

  @Post('character/appearance')
  randomizeAppearance(@Body() body: any) {
    return this.svc.randomizeAppearance(body);
  }

  @Post('character/portraits')
  generatePortraits(@Body() body: any) {
    return this.svc.generatePortraits(body);
  }

  @Post('character/summary')
  generateCharacterSummary(@Body() body: any) {
    return this.svc.generateCharacterSummary(body);
  }

  @Post('character/summary/stream')
  async generateCharacterSummaryStream(
    @Body() body: any,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    try {
      for await (const event of this.svc.generateCharacterSummaryStream(body)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      const message = getErrorMessage(err);
      console.error('Character summary generation failed:', err);
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('campaign/starship/images')
  generateStarshipImages(@Body() body: any) {
    return this.svc.generateStarshipImages(body);
  }

  @Post('world/description')
  generateWorldDescription(@Body() body: any) {
    return this.svc.generateWorldDescription(body);
  }

  @Post('sector/content')
  async generateSectorContent(@Body() body: any, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send SSE keepalive pings so the proxy doesn't 504 during the AI call
    const ping = setInterval(() => res.write(':ping\n\n'), 15_000);

    try {
      const result = await this.svc.generateSectorContent(body);
      const { _debug, ...data } = result;
      if (_debug) res.write(`data: ${JSON.stringify({ _debug })}\n\n`);
      res.write(`data: ${JSON.stringify({ text: JSON.stringify(data) })}\n\n`);
      res.write('data: [DONE]\n\n');
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: getErrorMessage(err) })}\n\n`);
    } finally {
      clearInterval(ping);
      res.end();
    }
  }

  @Post('launch/inciting-incident/stream')
  async generateLaunchIncidentStream(@Body() body: any, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    try {
      for await (const event of this.svc.generateLaunchIncidentStream(body)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      const message = getErrorMessage(err);
      console.error('Launch incident generation failed:', err);
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('launch/opening-scene/stream')
  async generateLaunchOpeningSceneStream(
    @Body() body: any,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    try {
      for await (const event of this.svc.generateLaunchOpeningSceneStream(
        body,
      )) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      const message = getErrorMessage(err);
      console.error('Launch opening scene generation failed:', err);
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('launch/vow/stream')
  async generateLaunchVowStream(@Body() body: any, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    try {
      for await (const event of this.svc.generateLaunchVowStream(body)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      const message = getErrorMessage(err);
      console.error('Launch vow generation failed:', err);
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('narrative/stream')
  async generateNarrativeStream(@Body() body: any, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    try {
      for await (const event of this.svc.generateNarrativeStream(body)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch {
      res.write(`data: ${JSON.stringify({ error: 'Generation failed' })}\n\n`);
    } finally {
      res.end();
    }
  }
}
