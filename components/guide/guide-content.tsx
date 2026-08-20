import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  Award,
  Bell,
  Clapperboard,
  CircleHelp,
  Flame,
  History,
  LayoutGrid,
  MessageSquare,
  Radio,
  ShieldCheck,
  Swords,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/league/shared";
import { FadeIn } from "@/components/motion/page-transition";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TocItem = { id: string; label: string };

const TOC: TocItem[] = [
  { id: "features", label: "Features" },
  { id: "league", label: "League" },
  { id: "live", label: "Live" },
  { id: "baaji", label: "Baaji" },
  { id: "rivalries", label: "Rivalries" },
  { id: "penalties", label: "Penalties (paused)" },
  { id: "awards", label: "Awards" },
  { id: "documentary", label: "Documentary" },
  { id: "dressing-room", label: "Dressing Room" },
  { id: "past-seasons", label: "Past seasons" },
  { id: "activity", label: "Activity points" },
  { id: "notifications", label: "Notifications" },
  { id: "verified", label: "Verified vs Unverified" },
  { id: "how-to", label: "How to…" },
];

function Section({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
          {title}
        </h2>
      </div>
      <div className="space-y-3 pl-0 text-sm leading-relaxed text-muted-foreground sm:pl-11 sm:text-[0.95rem]">
        {children}
      </div>
    </section>
  );
}

function HowTo({
  title,
  steps,
}: {
  title: string;
  steps: string[];
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <ol className="mt-3 space-y-2.5">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function GuideContent() {
  return (
    <div className="space-y-10">
      <FadeIn>
        <PageHeader
          eyebrow="Help"
          title="Guide"
          description="A friendly tour of Batch 16 — what each tab does, and how to get stuck in without asking the group chat."
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <div className="rounded-2xl border border-border/70 bg-muted/25 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <CircleHelp className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">
                New here? Do this first
              </p>
              <p>
                Register → confirm your email → sign in →{" "}
                <Link
                  href="/auth/claim"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  link your FPL manager
                </Link>
                . Until you&apos;re <Badge variant="secondary" className="mx-1 align-middle">Verified</Badge>
                you can browse the league, but chat, Baaji, and notifications stay locked.
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
        <nav
          aria-label="Guide sections"
          className="hidden lg:block"
        >
          <div className="sticky top-20 space-y-1">
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              On this page
            </p>
            {TOC.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  "block rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors",
                  "hover:bg-muted/80 hover:text-foreground",
                )}
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="space-y-12">
          <section id="features" className="scroll-mt-24 space-y-3">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              What&apos;s in the app
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
              Batch 16 wraps our private FPL league with standings, live scores,
              side bets, trash talk, and a bit of theatre. Jump to any section
              below — or skim the how-tos at the bottom when you just need the
              steps.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 lg:hidden">
              {TOC.filter((t) => t.id !== "features").map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </section>

          <Section
            id="league"
            icon={<LayoutGrid className="size-4" />}
            title="League"
          >
            <p>
              Home base. Switch between the <strong className="font-medium text-foreground">table</strong>,{" "}
              <strong className="font-medium text-foreground">pitch ranks</strong>, and{" "}
              <strong className="font-medium text-foreground">fixtures</strong>.
              You&apos;ll see FPL points, weekly wins, entry-fee Paid/Unpaid badges,
              Verified status, activity points, and prize balances.
            </p>
            <p>
              When a documentary episode is ready for a finished gameweek, it
              can show up here as a featured card — tap Watch to open the full
              episode.
            </p>
          </Section>

          <Section
            id="live"
            icon={<Radio className="size-4" />}
            title="Live Match Centre"
          >
            <p>
              While a gameweek is in play, Live refreshes scores as FPL updates.
              Use it on Saturday/Sunday afternoons to see who&apos;s flying,
              who&apos;s blanking, and how the mini-league table is shifting in
              real time.
            </p>
            <p>
              Live points are provisional until FPL settles bonus and deductions —
              treat mid-weekend ranks as drama, not final judgement.
            </p>
          </Section>

          <Section
            id="baaji"
            icon={<Swords className="size-4" />}
            title="Baaji (side bets)"
          >
            <p>
              Friendly side bets between managers — stake is informational (NPR
              for bragging rights), not taken from the prize pot. Create a
              challenge, your opponent accepts or declines, then someone records
              the winner when it&apos;s done. High stakes get a bigger celebration.
            </p>
            <p>
              You need to be <strong className="font-medium text-foreground">Verified</strong>{" "}
              to create or accept Baajis.
            </p>
          </Section>

          <Section
            id="rivalries"
            icon={<Flame className="size-4" />}
            title="Rivalries"
          >
            <p>
              Head-to-head stories pulled from how you finish against each other
              week to week — nemeses, heatmaps, and timelines. Good for spotting
              who always edges you… and who you own.
            </p>
          </Section>

          <Section
            id="penalties"
            icon={<Target className="size-4" />}
            title="Penalties (paused)"
          >
            <p>
              The shootout mini-game is temporarily turned off to keep the app
              fast on free-tier hosting. The code lives in{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                archive/penalties
              </code>{" "}
              and can return after we upgrade. Solo, multiplayer challenges, and
              live presence were all part of it.
            </p>
          </Section>

          <Section
            id="awards"
            icon={<Award className="size-4" />}
            title="Awards"
          >
            <p>
              Weekly shout-outs after a gameweek finishes — highest score,
              biggest climb, and other categories admins can tweak. Pure
              glory (and gentle roasting).
            </p>
          </Section>

          <Section
            id="documentary"
            icon={<Clapperboard className="size-4" />}
            title="Documentary"
          >
            <p>
              Auto-written “episodes” for finished gameweeks: the shock result,
              the worst decision, the dramatic overtake, plus a cliffhanger into
              next week. Rate episodes once you&apos;re verified. Nothing
              publishes for an unplayed week — no fake GW1 winners.
            </p>
          </Section>

          <Section
            id="dressing-room"
            icon={<MessageSquare className="size-4" />}
            title="Dressing Room"
          >
            <p>
              The league chat — cartoon seats, presence (who&apos;s online),
              reactions, replies, @mentions, and taunts. Open the full room from
              the account menu, or use the floating chat button on mobile.
            </p>
            <p>
              Unverified managers appear muted on the benches until they claim
              their seat. Only verified managers can post.
            </p>
          </Section>

          <Section
            id="past-seasons"
            icon={<History className="size-4" />}
            title="Past seasons"
          >
            <p>
              Archive of previous Batch seasons — weekly winners and season
              prizes imported from our historical workbook. Handy when someone
              claims they “always win” and the receipts say otherwise.
            </p>
          </Section>

          <Section
            id="activity"
            icon={<Activity className="size-4" />}
            title="Activity points"
          >
            <p>
              Extra points for being part of the league life — not FPL score.
              Posting in chat, putting up a Baaji, accepting one, wall posts,
              penalties, and similar actions can earn a few points. Totals show
              on the league table; admins can adjust if needed.
            </p>
            <p>
              Typical awards (subject to admin tweaks): creating/accepting a
              Baaji (+5), chat posts (+3), wall posts (+3), and smaller amounts
              for penalties and other actions.
            </p>
          </Section>

          <Section
            id="notifications"
            icon={<Bell className="size-4" />}
            title="Notifications"
          >
            <p>
              The bell in the top bar pings you for Baajis, chat replies,
              @mentions, taunts, new awards, and new documentary episodes. Only{" "}
              <strong className="font-medium text-foreground">Verified</strong>{" "}
              managers receive them — claim your seat first.
            </p>
          </Section>

          <Section
            id="verified"
            icon={<ShieldCheck className="size-4" />}
            title="Verified vs Unverified"
          >
            <p>
              Everyone synced from the FPL league starts as{" "}
              <strong className="font-medium text-foreground">Unverified</strong>{" "}
              — they show on the table, but they haven&apos;t joined Batch 16 yet.
            </p>
            <p>
              <strong className="font-medium text-foreground">Verified</strong>{" "}
              means you registered, signed in, and linked your manager (name +
              FPL team name). That unlocks Dressing Room, Baaji, wall posts,
              penalties play, ratings, and notifications.
            </p>
            <p>
              Paid / Unpaid is separate — that&apos;s only about the entry fee,
              flagged by an admin.
            </p>
          </Section>

          <section id="how-to" className="scroll-mt-24 space-y-5">
            <div className="space-y-2">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
                How to…
              </h2>
              <p className="text-sm text-muted-foreground">
                Short recipes for the stuff people ask about most.
              </p>
            </div>

            <div className="grid gap-4">
              <HowTo
                title="Create a Baaji"
                steps={[
                  "Go to Baaji and make sure you’re Verified (link your manager if not).",
                  "Pick an opponent from the avatar grid — you’ll see You vs Them.",
                  "Write a short description (what you’re betting on), optional stake in NPR, and optional gameweek.",
                  "Send it. They’ll get a notification; you both earn activity points when it’s created / accepted.",
                ]}
              />
              <HowTo
                title="Accept or decline a challenge"
                steps={[
                  "Open Baaji (or tap the notification).",
                  "Find the pending challenge aimed at you.",
                  "Accept to lock it in, or decline (darayo) if you’re not biting.",
                  "When the bet is settled, either side can mark the winner — admins can fix disputes.",
                ]}
              />
              <HowTo
                title="How the gameweek winner is decided"
                steps={[
                  "During the week, Live and the table show provisional scores — nobody is crowned yet.",
                  "When FPL finishes the gameweek and data is checked, the highest GW score(s) become the winner(s). Ties share the win.",
                  "An admin can also confirm winners manually (useful for delays or special cases).",
                  "Unplayed weeks (everyone on 0) never invent a winner. Payouts and celebrations only follow a finished / confirmed week.",
                ]}
              />
              <HowTo
                title="How activity points work"
                steps={[
                  "Be Verified and use the social features — chat, Baaji, wall, penalties, etc.",
                  "Points appear next to your name on the league table.",
                  "They’re separate from FPL points and the prize pot math.",
                  "Admins can hand out or adjust points if something looks off.",
                ]}
              />
              <HowTo
                title="Use the Dressing Room"
                steps={[
                  "Claim your manager so you’re Verified.",
                  "Open Dressing Room from the account menu, or the chat button on your phone.",
                  "Post messages, react, reply, and @mention people. Taunt a seat for a bit of chaos.",
                  "Unverified seats stay greyed out until those managers join — you can see them, they can’t talk yet.",
                ]}
              />
            </div>
          </section>

          <p className="border-t border-border/60 pt-6 text-sm text-muted-foreground">
            Still stuck? Ask in the Dressing Room — or nudge an admin. This is a
            friends league; we&apos;ll sort it out.
          </p>
        </div>
      </div>
    </div>
  );
}
