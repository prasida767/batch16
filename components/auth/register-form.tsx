"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail } from "lucide-react";
import { registerAction } from "@/app/auth/actions";
import type { ActionResult } from "@/lib/admin/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type RegisterActionResult = ActionResult & {
  email?: string;
};

export function RegisterForm({ nextPath }: { nextPath?: string | null }) {
  const [state, formAction, pending] = useActionState<
    RegisterActionResult | null,
    FormData
  >(registerAction, null);

  if (state?.ok) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span className="mb-2 inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="size-5" />
          </span>
          <CardTitle>Check your email</CardTitle>
          <CardDescription className="text-balance">
            We sent a confirmation link
            {state.email ? (
              <>
                {" "}
                to <span className="font-medium text-foreground">{state.email}</span>
              </>
            ) : null}
            . Open it to verify your account, then sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            Waiting for email verification. The link may take a minute — check
            spam if you don&apos;t see it.
          </div>
          <Link
            href="/auth/login"
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            Go to sign in
          </Link>
          <p className="text-center text-sm text-muted-foreground">
            Wrong email?{" "}
            <button
              type="button"
              className="font-medium text-foreground underline"
              onClick={() => window.location.assign("/auth/register")}
            >
              Register again
            </button>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          Register with your email, then verify your FPL manager to play Baaji and
          post.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {nextPath ? (
            <input type="hidden" name="next" value={nextPath} />
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {state && !state.ok ? (
            <p className="text-sm text-destructive">{state.message}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating…" : "Register"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-foreground underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
