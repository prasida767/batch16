"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/auth/actions";
import type { ActionResult } from "@/lib/admin/shared";
import { Button } from "@/components/ui/button";
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

export function LoginForm({
  errorHint,
  successHint,
  nextPath,
}: {
  errorHint?: string | null;
  successHint?: string | null;
  nextPath?: string | null;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(loginAction, null);

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Use the email you registered with. After signing in, verify your
          manager if you haven&apos;t already.
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {successHint ? (
            <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
              {successHint}
            </p>
          ) : null}
          {errorHint ? (
            <p className="text-sm text-destructive">{errorHint}</p>
          ) : null}
          {state ? (
            <p
              className={cn(
                "text-sm",
                state.ok ? "text-primary" : "text-destructive",
              )}
            >
              {state.message}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-foreground underline"
            >
              Create an account
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
