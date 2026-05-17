import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { DB } from '../../db/database.module';
import * as schema from '../../db/schema';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class CampaignMemberGuard implements CanActivate {
  constructor(@Inject(DB) private readonly db: Db) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId: string = req.user?.id;
    const campaignId: string = req.params?.campaignId ?? req.params?.id ?? req.body?.campaignId;
    if (!userId || !campaignId) throw new ForbiddenException();

    const [member] = await this.db
      .select()
      .from(schema.campaignMembers)
      .where(
        and(
          eq(schema.campaignMembers.campaignId, campaignId),
          eq(schema.campaignMembers.userId, userId),
        ),
      )
      .limit(1);

    if (!member) throw new ForbiddenException('Not a campaign member');
    return true;
  }
}
