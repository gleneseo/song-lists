"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ListMusic } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton } from "@/components/sign-out-button";
import { useSession } from "@/lib/auth/auth-client";

/**
 * `listsMenu` is the server-rendered "Lists" hover menu; it's passed in as a
 * slot because the navbar is a client component and can't query the database.
 */
function Navbar({
  listsMenu,
  adminMenu,
}: {
  listsMenu: ReactNode;
  adminMenu: ReactNode;
}) {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4">
        <Link
          href={session?.user ? "/dashboard" : "/"}
          aria-label="Song Lists"
          className="flex shrink-0 items-center gap-2 text-lg font-semibold"
        >
          <ListMusic className="size-5" />
          {/* On a phone the links need the room; the icon still says whose it is. */}
          <span className="hidden sm:inline">Song Lists</span>
        </Link>
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          {session?.user ? (
            <>
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link href="/dashboard" />}
              >
                Dashboard
              </Button>
              {listsMenu}
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link href="/songs" />}
              >
                Songs
              </Button>
              {adminMenu}
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
                    <DropdownMenuItem render={<Link href="/account" />}>
                      Account
                    </DropdownMenuItem>
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
