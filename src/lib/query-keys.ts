export const QK = {
  /** get_me() for one session. */
  me: (userId: string | undefined) => ["me", userId] as const,

  capsules: () => ["capsules"] as const,
  stock: () => ["stock"] as const,
  settings: () => ["settings"] as const,
  activity: () => ["activity"] as const,
  /** Owner only: the guest link's key. */
  joinKey: () => ["join-key"] as const,
} as const;

/** Mutation keys, so realtime refreshes can hold off while one is in flight. */
export const MK = {
  adjustStock: ["adjust-stock"] as const,
} as const;
