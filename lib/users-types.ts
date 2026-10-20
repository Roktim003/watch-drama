// WatchDrama — viewer user record types (Phase 3; split into its own module
// in Phase 4B so lib/db.ts can type the wd_users JSONB docs without a
// circular import — lib/users.ts re-exports everything from here, so all
// existing `import { type User } from "@/lib/users"` code is unchanged).

export interface UserProgress {
  episode: number;
  position: number; // seconds
  duration: number; // seconds
  updatedAt: string; // ISO timestamp
}

export interface User {
  id: string;
  name: string;
  email: string; // stored lowercase, unique
  passwordHash: string;
  salt: string;
  createdAt: string;
  watchlist: string[]; // title slugs
  bookings: string[]; // coming-soon title slugs
  progress: Record<string, UserProgress>; // keyed by title slug (latest episode)
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}
