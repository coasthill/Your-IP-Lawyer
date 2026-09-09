import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guard";
import { pluralise } from "@/lib/utils";
import { listAdminUsers } from "@/server/admin-users";
import { ActionRow, DataTable, Td, Th } from "@/components/admin/DataTable";
import { InlineDelete } from "@/components/admin/InlineAction";
import { PageHeader, SectionHeading } from "@/components/admin/PageHeader";
import { FlagChip } from "@/components/admin/StatusChip";
import { AddAdminForm, ChangePasswordForm } from "@/components/admin/UserForms";
import { formatDateTime } from "../../_lib/datetime";
import { addAdminAction, changePasswordAction, deleteAdminAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Users · Admin" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = (await listAdminUsers()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const canDelete = users.length > 1;

  return (
    <div>
      <PageHeader
        eyebrow="Users · Chambers"
        title="Who holds the keys."
        lede={`${pluralise(users.length, "admin account")}. Every admin can do everything here, so add people sparingly. Passwords are never stored — only a scrypt hash.`}
      />

      <section aria-labelledby="admins-heading">
        <SectionHeading number="01" title={<span id="admins-heading">Admin accounts</span>} aside={canDelete ? "The last account cannot be deleted" : "Only account — cannot be deleted"} />
        <DataTable caption="Admin accounts" className="min-w-[48rem]">
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Created</Th>
              <Th>Last sign-in</Th>
              <Th className="pr-0 text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const self = u.id === me.id;
              return (
                <tr key={u.id}>
                  <Td>
                    <span className="font-display text-lg text-ink">{u.name}</span>
                    {self ? <FlagChip tone="bronze" className="ml-2 align-middle">You</FlagChip> : null}
                  </Td>
                  <Td className="text-ink">{u.email}</Td>
                  <Td className="whitespace-nowrap text-graphite">
                    <time dateTime={u.createdAt.toISOString()}>{formatDateTime(u.createdAt)}</time>
                  </Td>
                  <Td className="whitespace-nowrap text-graphite">{u.lastLoginAt ? <time dateTime={u.lastLoginAt.toISOString()}>{formatDateTime(u.lastLoginAt)}</time> : <span className="text-ash">Never</span>}</Td>
                  <Td className="pr-0">
                    <ActionRow className="justify-end">
                      {self ? (
                        <a href="#password" className="btn btn-sm btn-ghost">
                          Change password
                        </a>
                      ) : canDelete ? (
                        <InlineDelete action={deleteAdminAction.bind(null, u.id)} question={`Remove ${u.name}'s access?`} confirmLabel="Remove access">
                          Delete
                        </InlineDelete>
                      ) : null}
                    </ActionRow>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
        <p className="mt-4 text-xs text-ash">Deleting an account signs that person out everywhere at once. You cannot delete your own account from here.</p>
      </section>

      <div className="mt-16 grid gap-16 lg:grid-cols-2">
        <section aria-labelledby="add-admin-heading">
          <SectionHeading number="02" title={<span id="add-admin-heading">Add an admin</span>} />
          <p className="mb-6 text-sm text-slate">They sign in at /admin/login with the password you set here and can change it afterwards.</p>
          <AddAdminForm action={addAdminAction} />
        </section>

        <section id="password" className="scroll-mt-20" aria-labelledby="password-heading">
          <SectionHeading number="03" title={<span id="password-heading">Change your password</span>} />
          <p className="mb-6 text-sm text-slate">
            Signed in as <span className="font-medium text-ink">{me.email}</span>. Twelve characters or more, with at least one letter and one number.
          </p>
          <ChangePasswordForm action={changePasswordAction} />
        </section>
      </div>
    </div>
  );
}
