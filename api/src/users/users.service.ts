import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { UserLayout, UserProfile } from '@starforged/shared';
import { DB } from '../db/database.module';
import * as schema from '../db/schema';

type UserRow = typeof schema.users.$inferSelect;

export function toUserProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    photoUrl: row.photoUrl ?? undefined,
    hidePhoto: row.hidePhoto,
    layout: (row.layoutJson as UserLayout) ?? {},
    appVersion: row.appVersion ?? undefined,
  };
}

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async findById(id: string): Promise<UserProfile> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));
    if (!user) throw new NotFoundException('User not found');
    return toUserProfile(user);
  }

  async update(id: string, patch: Partial<UserProfile>): Promise<UserProfile> {
    const values: Partial<typeof schema.users.$inferInsert> = {};
    if (patch.displayName !== undefined) values.displayName = patch.displayName;
    if (patch.photoUrl !== undefined) values.photoUrl = patch.photoUrl;
    if (patch.hidePhoto !== undefined) values.hidePhoto = patch.hidePhoto;
    if (patch.layout !== undefined) values.layoutJson = patch.layout;
    if (patch.appVersion !== undefined) values.appVersion = patch.appVersion;

    if (Object.keys(values).length === 0) {
      return this.findById(id);
    }

    const [updated] = await this.db
      .update(schema.users)
      .set(values)
      .where(eq(schema.users.id, id))
      .returning();
    return toUserProfile(updated);
  }
}
