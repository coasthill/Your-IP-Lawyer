import type { Metadata } from "next";
import { pluralise } from "@/lib/utils";
import { listCategories } from "@/server/taxonomy";
import { CategoryAddForm } from "@/components/admin/CategoryAddForm";
import { EmptyRecord } from "@/components/admin/EmptyRecord";
import { InlineDelete } from "@/components/admin/InlineAction";
import { PageHeader, SectionHeading } from "@/components/admin/PageHeader";
import { FlagChip } from "@/components/admin/StatusChip";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { addCategoryAction, deleteCategoryAction, updateCategoryAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Categories · Admin" };

const SCOPE_LABEL: Record<string, string> = { both: "Blog and forum", blog: "Blog only", forum: "Forum only" };

export default async function CategoriesPage() {
  const cats = await listCategories();

  return (
    <div>
      <PageHeader
        eyebrow="Categories · Taxonomy"
        title="Filed under."
        lede={`${pluralise(cats.length, "category", "categories")}. Each one can serve the blog, the forum or both; lower sort orders come first. The web address is fixed once created.`}
      />

      <section aria-labelledby="categories-heading">
        <SectionHeading number="01" title={<span id="categories-heading">Categories</span>} aside="Edit in place, then Save" />
        {cats.length ? (
          <div className="-mx-[var(--page-x)] overflow-x-auto px-[var(--page-x)]">
            <div className="min-w-[58rem] border-t border-ink/25">
              <div className="grid grid-cols-[3rem_1fr_1.6fr_11rem_6rem_auto_auto] gap-4 border-b border-ink/25 py-2.5 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash">
                <span aria-hidden="true">No.</span>
                <span>Name · address</span>
                <span>Description</span>
                <span>Scope</span>
                <span>Order</span>
                <span className="col-span-2 text-right">Actions</span>
              </div>
              <ol className="divide-y">
                {cats.map((c, i) => {
                  const fid = `cat-${c.id}`;
                  return (
                    <li key={c.id} className="grid grid-cols-[3rem_1fr_1.6fr_11rem_6rem_auto_auto] items-start gap-4 py-3">
                      <span className="pt-3 font-mono text-[0.66rem] tracking-[0.2em] text-lapis" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {/* The row is one form; the delete form sits beside it and shares nothing. */}
                      <form id={fid} action={updateCategoryAction.bind(null, c.id)} className="contents">
                        <div>
                          <label htmlFor={`${fid}-name`} className="sr-only">
                            Name
                          </label>
                          <input id={`${fid}-name`} name="name" defaultValue={c.name} maxLength={80} required className="font-display text-lg" />
                          <p className="mt-1 font-mono text-[0.62rem] tracking-[0.06em] text-ash">/{c.slug}</p>
                        </div>
                        <div>
                          <label htmlFor={`${fid}-desc`} className="sr-only">
                            Description
                          </label>
                          <input id={`${fid}-desc`} name="description" defaultValue={c.description ?? ""} maxLength={300} placeholder="One line, shown on category pages" />
                        </div>
                        <div>
                          <label htmlFor={`${fid}-scope`} className="sr-only">
                            Scope
                          </label>
                          <select id={`${fid}-scope`} name="scope" defaultValue={c.scope}>
                            {Object.entries(SCOPE_LABEL).map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`${fid}-order`} className="sr-only">
                            Sort order
                          </label>
                          <input id={`${fid}-order`} name="sortOrder" type="number" inputMode="numeric" defaultValue={c.sortOrder} min={-999} max={999} step={1} className="font-mono text-sm" />
                        </div>
                        <div className="pt-1">
                          <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
                        </div>
                      </form>
                      <div className="pt-1">
                        <InlineDelete action={deleteCategoryAction.bind(null, c.id)} question="Delete? Its articles and discussions stay, uncategorised." confirmLabel="Delete category" />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        ) : (
          <EmptyRecord title="No categories yet." body="Add one below. The seed script installs the standard set (Trade Marks, Patents, Copyright and so on) if you would rather start from those." />
        )}
        <p className="mt-4 text-xs text-ash">
          Deleting a category does not delete anything filed under it — those articles and discussions simply lose the label. Scope <FlagChip className="mx-1">forum only</FlagChip> hides the category from the article editor, and vice versa.
        </p>
      </section>

      <section className="mt-16" aria-labelledby="add-category-heading">
        <SectionHeading number="02" title={<span id="add-category-heading">Add a category</span>} />
        <div className="max-w-4xl">
          <CategoryAddForm action={addCategoryAction} />
        </div>
      </section>
    </div>
  );
}
