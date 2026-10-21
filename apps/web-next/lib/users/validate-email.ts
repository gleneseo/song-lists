const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailValidation =
  { ok: true; email: string } | { ok: false; message: string };

/** Checks an email address and tidies it (trimmed, lowercase) ready to save. */
function validateEmail(value: string): EmailValidation {
  const email = value.trim().toLowerCase();

  return EMAIL_PATTERN.test(email)
    ? { ok: true, email }
    : { ok: false, message: "Enter a valid email address." };
}

export { validateEmail };
