/** Shapes shared between the forum server actions and the client forms. */

export type ThreadFormState =
  | { status: "idle" }
  /** The thread was created but is waiting for moderation (approved threads redirect instead). */
  | { status: "pending" }
  | { status: "error"; error: string };

export type ReplyFormState = { status: "idle" } | { status: "approved" } | { status: "pending" } | { status: "error"; error: string };

export type ReportState = { status: "idle" } | { status: "done" } | { status: "error"; error: string };

/** A reply prepared on the server for the client tree: body already rendered to safe HTML, dates already formatted. */
export type ReplyView = {
  id: string;
  author: string;
  /** Relative time, e.g. "3 days ago". */
  when: string;
  whenIso: string;
  whenFull: string;
  bodyHtml: string;
  /** Set on replies deeper than the second level, which are flattened visually. */
  inReplyTo: string | null;
};

/** The subset of a category the new-thread form needs. */
export type CategoryOption = { id: string; name: string; description: string | null };
