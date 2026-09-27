"use client";

import Link from "next/link";
import { ListMusic } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton } from "@/components/sign-out-button";
import { useSession } from "@/lib/auth/auth-client";

function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <ListMusic className="size-5" />
          Song Lists
        </Link>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link href="/songs" />}
              >
                Songs
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                    />
                  }
                >
                  <Avatar size="sm">
                    <AvatarFallback>
                      {session.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">
                          {session.user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <SignOutButton />
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link href="/sign-in" />}
              >
                Log In
              </Button>
              <Button nativeButton={false} render={<Link href="/sign-up" />}>
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export { Navbar };
