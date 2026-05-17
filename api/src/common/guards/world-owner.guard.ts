import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { DB } from '../../db/database.module';
import * as schema from '../../db/schema';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class WorldOwnerGuard implements CanActivate {
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

    if (!owner) throw new ForbiddenException('Not a world owner');
    return true;
  }
}
