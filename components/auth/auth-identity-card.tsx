import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AuthIdentityCard({
  actingName,
  context,
  signedIn = false,
}: {
  actingName: string | null;
  context: "challenges" | "wall";
  signedIn?: boolean;
}) {
  if (actingName) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signed in</CardTitle>
          <CardDescription>
            {context === "challenges"
              ? "Baaji runs as your verified manager."
              : "Posts appear under your verified manager."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <p className="text-sm">
            Acting as{" "}
            <span className="font-semibold text-foreground">{actingName}</span>
          </p>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (signedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Link your manager</CardTitle>
          <CardDescription>
            You&apos;re signed in, but your account isn&apos;t linked to a league
            manager yet. Confirm your name and FPL team name to{" "}
            {context === "challenges" ? "post baaji" : "post"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/auth/claim"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            Link manager
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Verify to participate</CardTitle>
        <CardDescription>
          Register with your email, then confirm your name and FPL team name.
          That replaces the old “who are you?” picker.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Link
          href="/auth/register"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          Register
        </Link>
        <Link
          href="/auth/login"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Sign in
        </Link>
        <Link
          href="/auth/claim"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Link manager
        </Link>
      </CardContent>
    </Card>
  );
}
