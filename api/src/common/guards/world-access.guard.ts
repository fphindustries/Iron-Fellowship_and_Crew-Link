import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, inArray } from 'drizzle-orm';
import { DB } from '../../db/database.module';
import * as schema from '../../db/schema';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class WorldAccessGuard implements CanActivate {
  constructor(@Inject(DB) private readonly db: Db) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId: string = req.user?.id;
    const worldId: string = req.params?.worldId ?? req.body?.worldId;
    if (!userId || !worldId) throw new ForbiddenException();

    const [owner] = await this.db
      .select()
      .from(schema.worldOwners)
      .where(
        and(
          eq(schema.worldOwners.worldId, worldId),
          eq(schema.worldOwners.userId, userId),
        ),
      )
      .limit(1);
    if (owner) return true;

    const campaigns = await this.db
      .select({ campaignId: schema.campaigns.id })
      .from(schema.campaigns)
      .where(eq(schema.campaigns.worldId, worldId));
    if (campaigns.length === 0) {
      throw new ForbiddenException('Not a world owner or campaign member');
    }

    const [member] = await this.db
      .select()
      .from(schema.campaignMembers)
      .where(
        and(
          eq(schema.campaignMembers.userId, userId),
          inArray(
            schema.campaignMembers.campaignId,
            campaigns.map((campaign) => campaign.campaignId),
          ),
        ),
      )
      .limit(1);

    if (!member) {
      throw new ForbiddenException('Not a world owner or campaign member');
    }
    return true;
  }
}
