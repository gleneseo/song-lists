import { notFound } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { signUpAllowed } from "@/lib/auth/sign-up";

/** The sign-up page, which is a page that isn't there while sign-up is switched off. */
export default function SignUpPage() {
  if (!signUpAllowed()) {
    notFound();
  }

  return <SignUpForm />;
}
