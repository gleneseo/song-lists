"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { DetailsSection as Section } from "@/components/details-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetUserPassword, setUserActive } from "@/lib/actions/manage-user";
import { generatePassword } from "@/lib/users/generate-password";

/**
 * The admin's account controls for another user: set a new password (shown in
 * the clear so it can be passed on -- the old one is stored hashed and can't
 * be read back) and deactivate or reactivate the account.
 */
function UserAccountActions({
  userId,
  deactivated,
}: {
  userId: string;
  deactivated: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleReset(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage(null);
    setBusy(true);

    try {
      const result = await resetUserPassword({ userId, password });

      setPasswordMessage(
        result.status === "done"
          ? {
              kind: "success",
              text: "Password updated. Their other sessions were signed out.",
            }
          : { kind: "error", text: result.message },
      );
    } catch (caught) {
      setPasswordMessage({
        kind: "error",
        text:
          caught instanceof Error
            ? caught.message
            : "Failed to reset the password.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive() {
    setAccountError("");
    setBusy(true);

    try {
      const result = await setUserActive({ userId, active: deactivated });

      if (result.status === "done") {
        setConfirming(false);
        router.refresh();
        return;
      }

      setAccountError(result.message);
    } catch (caught) {
      setAccountError(
        caught instanceof Error ? caught.message : "Failed to update the user.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Section title="Reset password">
        <form onSubmit={handleReset} className="flex flex-col gap-2">
          <Label htmlFor="reset-user-password" className="sr-only">
            New password
          </Label>
          <div className="flex gap-2">
            <Input
              id="reset-user-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="New password"
              className="font-mono"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setPassword(generatePassword())}
              disabled={busy}
            >
              Generate
            </Button>
            <Button type="submit" disabled={busy || !password}>
              Set
            </Button>
          </div>
          {passwordMessage && (
            <p
              role={passwordMessage.kind === "error" ? "alert" : "status"}
              className={
                passwordMessage.kind === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {passwordMessage.text}
            </p>
          )}
        </form>
      </Section>

      <Section title={deactivated ? "Deactivated" : "Deactivate account"}>
        <p className="text-sm text-muted-foreground">
          {deactivated
            ? "This account can't sign in. Their songs and history are kept."
            : "They'll be signed out and unable to sign in. Their songs and history are kept, and you can reactivate the account later."}
        </p>
        {accountError && (
          <p role="alert" className="text-sm text-destructive">
            {accountError}
          </p>
        )}
        <div className="flex gap-2">
          {deactivated ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleToggleActive}
              disabled={busy}
            >
              Reactivate
            </Button>
          ) : confirming ? (
            <>
              <Button
                type="button"
                variant="destructive"
                onClick={handleToggleActive}
                disabled={busy}
              >
                Confirm deactivate
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={busy}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirming(true)}
            >
              Deactivate
            </Button>
          )}
        </div>
      </Section>
    </>
  );
}

export { UserAccountActions };
