import type { ProviderStatus } from "../api/types";
import type { Key } from "../i18n/core";

export type Decision = Exclude<ProviderStatus, "PENDING">;
/** Labels are dictionary keys; the page translates them. `seed` is the note pre-filled in the dialog. */
export interface DecisionDef {
  status: Decision; label: Key; variant: "primary" | "danger-outline" | "secondary"; tone?: "danger";
  noteLabel: Key; seed?: Key; done: Key; title: Key;
}

const SUSPEND: DecisionDef = { status: "SUSPENDED", label: "dec.suspend", variant: "danger-outline", tone: "danger", noteLabel: "dec.suspend.note", done: "dec.suspend.done", title: "dec.suspend.title" };
const BAN: DecisionDef = { status: "BANNED", label: "dec.ban", variant: "danger-outline", tone: "danger", noteLabel: "dec.ban.note", done: "dec.ban.done", title: "dec.ban.title" };

/** Admin decisions available for each provider status (shared by the Providers and Reports pages). */
export const DECISIONS: Record<ProviderStatus, DecisionDef[]> = {
  PENDING: [
    { status: "APPROVED", label: "dec.approve", variant: "primary", noteLabel: "dec.approve.note", seed: "dec.approve.seed", done: "dec.approve.done", title: "dec.approve.title" },
    { status: "REJECTED", label: "dec.reject", variant: "danger-outline", tone: "danger", noteLabel: "dec.reject.note", done: "dec.reject.done", title: "dec.reject.title" },
  ],
  APPROVED: [SUSPEND, BAN],
  SUSPENDED: [
    { status: "APPROVED", label: "dec.reinstate", variant: "primary", noteLabel: "dec.approve.note", seed: "dec.reinstate.seed", done: "dec.reinstate.done", title: "dec.reinstate.title" },
    BAN,
  ],
  REJECTED: [], BANNED: [],
};

export { SUSPEND };
