// App-facing types, derived from the generated schema (database.gen.ts; regenerate with
// `npm run gen:types` after a migration). The CHECK-constrained text columns are narrowed to
// unions here, since the generator only sees `string`.

import type { Database } from "./database.gen";

export type { Database };

type Tables = Database["public"]["Tables"];
type Functions = Database["public"]["Functions"];

export type SpiritType = "vodka" | "tequila" | "whiskey" | "rum" | "gin" | "multi";
export type ActivityKindType = "take" | "restock" | "add";
export type MeRoleType = "owner" | "guest";

export type CapsuleDbType = Omit<Tables["capsules"]["Row"], "spirit"> & { spirit: SpiritType };
export type StockDbType = Tables["stock"]["Row"];
export type SettingsDbType = Tables["settings"]["Row"];
export type ActivityDbType = Omit<Tables["activity"]["Row"], "kind"> & { kind: ActivityKindType };

/** Who's signed in, as far as the bar is concerned (get_me()). */
export interface MeType {
  role: MeRoleType;
  name: string;
}

/** join_bar() outcomes; see supabase/migrations/015_guest_link.sql. */
export type JoinBarStatusType = "ok" | "no_name" | "bad_key" | "not_configured" | "not_signed_in";

export type TakeCapsuleResultType = Functions["take_capsule"]["Returns"][number];
