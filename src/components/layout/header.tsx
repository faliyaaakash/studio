"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons";
import { useAuth } from "@/components/providers/auth-provider";
import { UserNav } from "@/components/auth/user-nav";

export default function Header() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Logo className="h-6 w-6 text-primary" />
            <span className="font-bold">QuizWhiz</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {loading ? (
             <div className="flex items-center space-x-2">
               <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
               <div className="h-8 w-8 animate-pulse rounded-full bg-muted"></div>
             </div>
          ) : user ? (
            <UserNav />
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
