import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const isAdminUser = vi.fn();

vi.mock("@/lib/auth/auth", () => ({ getSession }));
vi.mock("@/lib/queries/users", () => ({ isAdminUser }));

describe("getAdminUserId", () => {
  beforeEach(() => {
    getSession.mockReset();
    isAdminUser.mockReset();
  });

  it("should return null when nobody is signed in", async () => {
    getSession.mockResolvedValue(null);
    const { getAdminUserId } = await import("@/lib/auth/admin");

    expect(await getAdminUserId()).toBeNull();
    expect(isAdminUser).not.toHaveBeenCalled();
  });

  it("should return null for a signed-in user who isn't an admin", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    isAdminUser.mockResolvedValue(false);
    const { getAdminUserId } = await import("@/lib/auth/admin");

    expect(await getAdminUserId()).toBeNull();
    expect(isAdminUser).toHaveBeenCalledWith("u1");
  });

  it("should return the user's ID when they're an admin", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    isAdminUser.mockResolvedValue(true);
    const { getAdminUserId } = await import("@/lib/auth/admin");

    expect(await getAdminUserId()).toBe("u1");
  });
});
