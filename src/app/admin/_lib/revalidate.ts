import { revalidatePath } from "next/cache";

/** Refreshes every dashboard page (sidebar badges live in the layout) after a mutation. */
export function revalidateAdmin() {
  try {
    revalidatePath("/admin", "layout");
  } catch {
    /* ignore outside request scope */
  }
}
