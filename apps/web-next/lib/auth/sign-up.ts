import { switchedOn } from "@/lib/config/switched-on";

/**
 * Whether anyone may create their own account. Off unless the
 * `NEXT_PUBLIC_ALLOW_SIGN_UP` environment variable is exactly `true`; with
 * it off, an admin creates accounts from the Users page instead. Like the
 * other `NEXT_PUBLIC_` settings it is fixed when the app is built, so the
 * pages and the server always agree.
 */
function signUpAllowed(): boolean {
  // Written out in full, not read by a computed name, so the build can put
  // the value into the browser code.
  return switchedOn(process.env.NEXT_PUBLIC_ALLOW_SIGN_UP);
}

const SIGN_UP_PATH = "/api/auth/sign-up";

/**
 * The refusal to send for a request to create an account while sign-up is
 * off, or `null` when the request should go on to Better Auth. Only the
 * public route is closed: the server-side sign-up call the admin's
 * create-user action makes doesn't pass through here.
 */
function closedSignUpResponse(request: Request): Response | null {
  const { pathname } = new URL(request.url);
  const isSignUp =
    pathname === SIGN_UP_PATH || pathname.startsWith(`${SIGN_UP_PATH}/`);

  if (!isSignUp || signUpAllowed()) {
    return null;
  }

  return Response.json(
    { message: "Sign-up is closed. Ask an admin to create your account." },
    { status: 403 },
  );
}

export { closedSignUpResponse, signUpAllowed };
