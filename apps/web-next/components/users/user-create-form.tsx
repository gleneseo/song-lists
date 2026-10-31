"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
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
import { createUser } from "@/lib/actions/create-user";
import { generatePassword } from "@/lib/users/generate-password";

const ROLES = Object.values(USER_ROLE);

/** The admin form for a new user: profile, role, and a starting password to pass on. */
function UserCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(USER_ROLE.USER);
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const result = await createUser({
        name,
        firstName,
        lastName,
        email,
        role,
        bio,
        password,
      });

      if (result.status === "created") {
        router.push(`/users/${result.userId}`);
        return;
      }

      setError(
        result.status === "duplicate"
          ? `Another user already has the email ${result.email}.`
          : result.message,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to create the user.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h1 className="text-xl leading-snug font-semibold">New user</h1>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="new-user-name">Display name</Label>
        <Input
          id="new-user-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="new-user-first-name">First name</Label>
          <Input
            id="new-user-first-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="new-user-last-name">Last name</Label>
          <Input
            id="new-user-last-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="new-user-email">Email</Label>
        <Input
          id="new-user-email"
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
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="new-user-password">Password</Label>
        <div className="flex gap-2">
          <Input
            id="new-user-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            required
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setPassword(generatePassword())}
            disabled={saving}
          >
            Generate
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Shown here in the clear so you can pass it on; they can change it from
          their account page.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="new-user-bio">Bio</Label>
        <Textarea
          id="new-user-bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/users")}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create user"}
        </Button>
      </div>
    </form>
  );
}

export { UserCreateForm };
