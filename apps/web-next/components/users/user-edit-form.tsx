"use client";

import { useState, type SubmitEvent } from "react";
import { USER_ROLE } from "@song-lists/db/user-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateUser } from "@/lib/actions/edit-user";
import type { UserRecord } from "@/lib/queries/users";

const ROLES = Object.values(USER_ROLE);

/** The admin form for a user's profile fields and role. */
function UserEditForm({
  user,
  isSelf,
  onCancel,
  onSaved,
}: {
  user: UserRecord;
  /** Whether the admin is editing their own account, whose role is locked. */
  isSelf: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [bio, setBio] = useState(user.bio ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const result = await updateUser({
        userId: user.id,
        name,
        firstName,
        lastName,
        email,
        role,
        bio,
      });

      if (result.status === "updated") {
        onSaved();
        return;
      }

      setError(
        result.status === "duplicate"
          ? `Another user already has the email ${result.email}.`
          : result.message,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to save the user.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h1 className="text-xl leading-snug font-semibold">Edit user</h1>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-user-name">Display name</Label>
        <Input
          id="edit-user-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="edit-user-first-name">First name</Label>
          <Input
            id="edit-user-first-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="edit-user-last-name">Last name</Label>
          <Input
            id="edit-user-last-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-user-email">Email</Label>
        <Input
          id="edit-user-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Role</Label>
        <Select
          value={role}
          disabled={isSelf}
          onValueChange={(value) => {
            if (value !== null) {
              setRole(value);
            }
          }}
        >
          <SelectTrigger className="w-full capitalize">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((option) => (
              <SelectItem key={option} value={option} className="capitalize">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSelf && (
          <p className="text-xs text-muted-foreground">
            You can&rsquo;t change your own role.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-user-bio">Bio</Label>
        <Textarea
          id="edit-user-bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export { UserEditForm };
