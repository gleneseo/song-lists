"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type SubmitEvent } from "react";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeMyEmail, changeMyPassword } from "@/lib/actions/change-account";

/**
 * Keeps a browser or password manager from filling a field in. On this page
 * the current password is asked for as proof that the person is at the
 * keyboard, and the new email address is meant to differ from the saved one.
 */
const NO_AUTOFILL = {
  autoComplete: "off",
  "data-1p-ignore": true,
  "data-lpignore": "true",
} as const;

/** What a form says after a try: nothing yet, a problem, or that it worked. */
type Outcome = { kind: "error" | "done"; text: string } | null;

function Message({ outcome }: { outcome: Outcome }) {
  if (!outcome) {
    return null;
  }

  return outcome.kind === "error" ? (
    <p
      role="alert"
      className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
    >
      {outcome.text}
    </p>
  ) : (
    <p role="status" className="rounded-md bg-muted p-3 text-sm">
      {outcome.text}
    </p>
  );
}

function EmailForm({ email }: { email: string }) {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [saving, setSaving] = useState(false);

  // Next keeps a page it has left in the browser, hidden, so coming back to it
  // is instant -- including across signing out and in again. React runs this
  // cleanup when the page is hidden, so nothing typed, and no message, is
  // still there when it is shown again.
  useEffect(
    () => () => {
      setNewEmail("");
      setCurrentPassword("");
      setOutcome(null);
    },
    [],
  );

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setOutcome(null);
    setSaving(true);

    try {
      const result = await changeMyEmail({ newEmail, currentPassword });

      if (result.status === "changed") {
        setOutcome({
          kind: "done",
          text: "Your email address has been changed. Use it to sign in from now on.",
        });
        setNewEmail("");
        setCurrentPassword("");
        router.refresh();
      } else {
        setOutcome({ kind: "error", text: result.message });
      }
    } catch {
      setOutcome({ kind: "error", text: "Something went wrong. Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="account-email-heading"
      className="rounded-xl bg-card p-6 ring-1 ring-foreground/10"
    >
      <h2 id="account-email-heading" className="text-xl font-semibold">
        Email address
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You sign in with your email address. It is{" "}
        <strong data-testid="current-email">{email}</strong> now.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <Message outcome={outcome} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="account-new-email">New email address</Label>
          <Input
            id="account-new-email"
            type="email"
            autoComplete="off"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="account-email-password">Current password</Label>
          <PasswordInput
            id="account-email-password"
            {...NO_AUTOFILL}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </div>
        <div>
          <Button type="submit" disabled={saving}>
            {saving ? "Changing…" : "Change email"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [saving, setSaving] = useState(false);

  // Cleared when the page is hidden; see the same effect in EmailForm.
  useEffect(
    () => () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setOutcome(null);
    },
    [],
  );

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setOutcome(null);

    if (newPassword !== confirmation) {
      setOutcome({
        kind: "error",
        text: "The new password and its confirmation don't match.",
      });
      return;
    }

    setSaving(true);

    try {
      const result = await changeMyPassword({ currentPassword, newPassword });

      if (result.status === "changed") {
        setOutcome({
          kind: "done",
          text: "Your password has been changed. Any other device you were signed in on has been signed out.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmation("");
      } else {
        setOutcome({ kind: "error", text: result.message });
      }
    } catch {
      setOutcome({ kind: "error", text: "Something went wrong. Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="account-password-heading"
      className="rounded-xl bg-card p-6 ring-1 ring-foreground/10"
    >
      <h2 id="account-password-heading" className="text-xl font-semibold">
        Password
      </h2>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <Message outcome={outcome} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="account-current-password">Current password</Label>
          <PasswordInput
            id="account-current-password"
            {...NO_AUTOFILL}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="account-new-password">New password</Label>
          <PasswordInput
            id="account-new-password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="account-confirm-password">Confirm new password</Label>
          <PasswordInput
            id="account-confirm-password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
          />
        </div>
        <div>
          <Button type="submit" disabled={saving}>
            {saving ? "Changing…" : "Change password"}
          </Button>
        </div>
      </form>
    </section>
  );
}

/** The signed-in person's own account page: change the email they sign in with, and their password. */
function AccountForms({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">Signed in as {name}.</p>
      <EmailForm email={email} />
      <PasswordForm />
    </div>
  );
}

export { AccountForms };
