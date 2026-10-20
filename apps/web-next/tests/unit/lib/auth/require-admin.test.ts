import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const getAdminUserId = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
const notFound = vi.fn(() => {
  throw new Error("not-found");
});

vi.mock("@/lib/auth/auth", () => ({ getSession }));
vi.mock("@/lib/auth/admin", () => ({ getAdminUserId }));
vi.mock("next/navigation", () => ({ redirect, notFound }));

describe("requireAdmin", () => {
  beforeEach(() => {
    getSession.mockReset();
    getAdminUserId.mockReset();
    redirect.mockClear();
    notFound.mockClear();
  });

  it("should send a signed-out visitor to sign in", async () => {
    getSession.mockResolvedValue(null);
    const { requireAdmin } = await import("@/lib/auth/require-admin");

    await expect(requireAdmin()).rejects.toThrow("redirect:/sign-in");
    expect(getAdminUserId).not.toHaveBeenCalled();
  });

  it("should answer a signed-in non-admin with a 404", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    getAdminUserId.mockResolvedValue(null);
    const { requireAdmin } = await import("@/lib/auth/require-admin");

    await expect(requireAdmin()).rejects.toThrow("not-found");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("should return the admin's ID", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    getAdminUserId.mockResolvedValue("u1");
    const { requireAdmin } = await import("@/lib/auth/require-admin");

    expect(await requireAdmin()).toBe("u1");
    expect(redirect).not.toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
  });
});
