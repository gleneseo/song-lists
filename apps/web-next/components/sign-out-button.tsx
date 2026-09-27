"use client";

import { useRouter } from "next/navigation";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/auth-client";

function SignOutButton() {
  const router = useRouter();

  async function handleClick() {
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return <DropdownMenuItem onClick={handleClick}>Log Out</DropdownMenuItem>;
}

export { SignOutButton };
