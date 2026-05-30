/**
 * Drizzle query mock factory for service unit tests.
 *
 * Design:
 * - The top-level `db` object is NOT thenable — so NestJS DI injects it as-is.
 * - `db.where()` returns a "queryResult" which IS thenable, allowing both:
 *     await db.select().from(t).where(w)          — direct await
 *     await db.select().from(t).where(w).limit(1) — chained
 *     await db.update(t).set(v).where(w).returning() — chained
 * - `db.returning()` and `db.onConflictDoNothing()` handle insert/update
 *   chains that don't pass through where().
 *
 * Usage:
 *   const { db, mockWhere, mockReturning } = createMockDb();
 *   mockWhere.mockReturnValueOnce(createQueryResult([row1]));
 *   mockReturning.mockResolvedValueOnce([insertedRow]);
 */
export function createQueryResult(resolvedValue: any[] = []) {
  const q: any = {
    limit: jest.fn().mockResolvedValue(resolvedValue),
    orderBy: jest.fn().mockResolvedValue(resolvedValue),
    returning: jest.fn().mockResolvedValue(resolvedValue),
    then: (onFulfilled: (v: any) => any, onRejected?: (e: any) => any) =>
      Promise.resolve(resolvedValue).then(onFulfilled, onRejected),
    catch: (onRejected: (e: any) => any) =>
      Promise.resolve(resolvedValue).catch(onRejected),
    finally: (onFinally: () => void) =>
      Promise.resolve(resolvedValue).finally(onFinally),
  };
  return q;
}

export function createMockDb() {
  const mockWhere = jest.fn().mockImplementation(() => createQueryResult([]));
  const mockReturning = jest.fn().mockResolvedValue([]);
  const mockOnConflictDoNothing = jest.fn().mockResolvedValue([]);

  const chain: any = {
    select: jest.fn(),
    from: jest.fn(),
    where: mockWhere,
    set: jest.fn(),
    values: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    onConflictDoUpdate: jest.fn(),
    returning: mockReturning,
    onConflictDoNothing: mockOnConflictDoNothing,
  };

  chain.select.mockReturnValue(chain);
  chain.from.mockReturnValue(chain);
  chain.set.mockReturnValue(chain);
  chain.values.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.onConflictDoUpdate.mockReturnValue(chain);

  return { db: chain, mockWhere, mockReturning, mockOnConflictDoNothing };
}
