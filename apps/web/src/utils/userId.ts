import type { User } from "@/types";

/** Resolve Mongo user id from login (`id`) or /me (`_id`) payloads. */
export function resolveUserId(user: User | null | undefined): string | undefined {
  if (!user) return undefined;
  const raw = user._id ?? user.id ?? user.userId;
  if (raw == null || raw === "") return undefined;
  return String(raw);
}

export function normalizeAuthUser(user: User | null | undefined): User | null {
  if (!user) return null;
  const id = resolveUserId(user);
  if (!id) return user;
  return { ...user, _id: id, id };
}
