"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DetailsSection as Section } from "@/components/details-section";
import { EditButton } from "@/components/edit-button";
import { UserAccountActions } from "@/components/users/user-account-actions";
import { UserEditForm } from "@/components/users/user-edit-form";
import type { UserRecord } from "@/lib/queries/users";
import { formatDate } from "@/lib/text/format-date";

/** A user's details, with a button that swaps them for the admin edit form. */
function UserDetailsPanel({
  user,
  isSelf,
}: {
  user: UserRecord;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <UserEditForm
        user={user}
        isSelf={isSelf}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl leading-snug font-semibold wrap-anywhere">
          {user.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {user.email} · <span className="capitalize">{user.role}</span>
          {user.deactivatedAt && " · Deactivated"}
        </p>
      </header>

      {fullName && <Section title="Name">{fullName}</Section>}
      {user.bio && (
        <Section title="Bio">
          <p className="whitespace-pre-line">{user.bio}</p>
        </Section>
      )}

      {!isSelf && (
        <UserAccountActions
          userId={user.id}
          deactivated={user.deactivatedAt !== null}
        />
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          Joined {formatDate(user.createdAt)}
        </p>
        <EditButton onClick={() => setEditing(true)} />
      </div>
    </article>
  );
}

export { UserDetailsPanel };
