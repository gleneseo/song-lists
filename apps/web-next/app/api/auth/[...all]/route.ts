import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/auth";
import { closedSignUpResponse } from "@/lib/auth/sign-up";

const handlers = toNextJsHandler(auth);

/** Sign-up requests are refused while sign-up is switched off; everything else is Better Auth's. */
async function POST(request: Request): Promise<Response> {
  return closedSignUpResponse(request) ?? handlers.POST(request);
}

const { GET } = handlers;

export { GET, POST };
