/** Shared shaping helpers so we never leak password hashes or internal fields. */

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
}

export const publicUser = (u: any): PublicUser | null =>
  u
    ? {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatarColor: u.avatarColor,
      }
    : null;

export const safeParseTags = (raw: unknown): string[] => {
  if (typeof raw !== 'string') return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

const AVATAR_COLORS = [
  '#4f46e5',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
];

export const pickAvatarColor = (seed: string): string => {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};
