import type { ReactNode } from "react";
import { InlineAction, InlineDelete } from "./InlineAction";

type Action = () => Promise<void>;

/**
 * Approve / hide / spam / return-to-queue / delete for one piece of guest content.
 * The actions arrive already bound to the item's id. Extra controls (pin, lock) go first.
 */
export function ModerationActions({
  status,
  approve,
  hide,
  spam,
  pend,
  remove,
  children,
}: {
  status: string;
  approve: Action;
  hide: Action;
  spam: Action;
  pend: Action;
  remove: Action;
  children?: ReactNode;
}) {
  return (
    <>
      {children}
      {status !== "approved" ? (
        <InlineAction action={approve} variant="solid" pendingLabel="Approving…">
          Approve
        </InlineAction>
      ) : null}
      {status !== "hidden" ? (
        <InlineAction action={hide} pendingLabel="Hiding…">
          Hide
        </InlineAction>
      ) : null}
      {status !== "spam" ? (
        <InlineAction action={spam} pendingLabel="Marking…" title="Mark as spam: never shown, kept for the record">
          Spam
        </InlineAction>
      ) : null}
      {status === "hidden" || status === "spam" ? (
        <InlineAction action={pend} variant="ghost" pendingLabel="Moving…">
          Back to queue
        </InlineAction>
      ) : null}
      <InlineDelete action={remove} />
    </>
  );
}
