import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "./api.config";

// MSW is overkill for this level — we stub fetch directly
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Stub queryClient so invalidation calls don't throw
vi.mock("lib/queryClient", () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

// Suppress the store import in handleAuthFailure
vi.mock("stores/store", () => ({
  useStore: { setState: vi.fn() },
}));

function makeResponse(
  body: string,
  status = 200,
  ok = true
): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(JSON.parse(body)),
    text: () => Promise.resolve(body),
    body: null,
  } as unknown as Response;
}

describe("api.get", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns parsed JSON on success", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(JSON.stringify({ id: "1" }))
    );
    const result = await api.get<{ id: string }>("/api/test");
    expect(result).toEqual({ id: "1" });
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse("", 404, false));
    await expect(api.get("/api/missing")).rejects.toThrow("GET /api/missing failed: 404");
  });

  it("retries after a 401 if the refresh succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse("", 401, false)) // original request
      .mockResolvedValueOnce(makeResponse("true", 200, true)) // refresh call
      .mockResolvedValueOnce(makeResponse(JSON.stringify({ ok: true }))); // retry

    const result = await api.get<{ ok: boolean }>("/api/protected");
    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

describe("api.post", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("sends JSON body and returns parsed response", async () => {
    const payload = { name: "campaign" };
    mockFetch.mockResolvedValueOnce(
      makeResponse(JSON.stringify({ id: "c1" }))
    );
    const result = await api.post<{ id: string }>("/api/campaigns", payload);
    expect(result).toEqual({ id: "c1" });
    const [, init] = mockFetch.mock.calls[0];
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual(payload);
  });

  it("handles empty response body (returns undefined)", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(""));
    const result = await api.post("/api/campaigns/c1/members", { userId: "u1" });
    expect(result).toBeUndefined();
  });
});

describe("api.del", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("sends a DELETE request and resolves without a return value", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(""));
    await expect(api.del("/api/campaigns/c1")).resolves.toBeUndefined();
    const [, init] = mockFetch.mock.calls[0];
    expect((init as RequestInit).method).toBe("DELETE");
  });

  it("throws on non-ok DELETE response", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse("", 403, false));
    await expect(api.del("/api/campaigns/c1")).rejects.toThrow(
      "DELETE /api/campaigns/c1 failed: 403"
    );
  });
});
