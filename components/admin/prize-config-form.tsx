"use client";

import { useActionState, useMemo, useState } from "react";
import { Coins, Plus, Trash2 } from "lucide-react";
import { savePrizeConfig } from "@/app/admin/actions";
import type { PrizeFormState } from "@/lib/admin/shared";
import type { CustomPrize, PrizeConfigFormValues } from "@/lib/prizes";
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
import {
  CURRENCIES,
  DEFAULT_PLANNED_GAMEWEEKS,
  createCustomPrizeId,
  formatMoney,
  parseMoney,
  remainingPot,
  seasonPrizesTotal,
  totalPot,
  weeklyBudget,
} from "@/lib/prizes";
import { cn } from "@/lib/utils";

export function PrizeConfigForm({
  initial,
  managerCount,
}: {
  initial: PrizeConfigFormValues;
  managerCount: number;
}) {
  const [state, formAction, pending] = useActionState<
    PrizeFormState,
    FormData
  >(savePrizeConfig, null);

  const [entryFee, setEntryFee] = useState(initial.entryFee);
  const [weeklyWinner, setWeeklyWinner] = useState(initial.weeklyWinner);
  const [overall1st, setOverall1st] = useState(initial.overall1st);
  const [overall2nd, setOverall2nd] = useState(initial.overall2nd);
  const [lastPlace, setLastPlace] = useState(initial.lastPlace);
  const [customPrizes, setCustomPrizes] = useState<CustomPrize[]>(
    initial.customPrizes,
  );
  const [currency, setCurrency] = useState(initial.currency);
  const [plannedGameweeks, setPlannedGameweeks] = useState(
    DEFAULT_PLANNED_GAMEWEEKS,
  );

  const pot = useMemo(
    () => totalPot(parseMoney(entryFee), managerCount),
    [entryFee, managerCount],
  );
  const weeklyTotal = weeklyBudget(parseMoney(weeklyWinner), plannedGameweeks);
  const seasonTotal = seasonPrizesTotal({
    overall1st,
    overall2nd,
    lastPlace,
    customPrizes,
  });
  const remaining = remainingPot({
    pot,
    weeklyWinner: parseMoney(weeklyWinner),
    gameweeks: plannedGameweeks,
    overall1st,
    overall2nd,
    lastPlace,
    customPrizes,
  });
  const overAllocated = remaining < -0.005;

  function addCustomPrize() {
    setCustomPrizes((prev) => [
      ...prev,
      {
        id: createCustomPrizeId(),
        label: "",
        amount: "0.00",
      },
    ]);
  }

  function updateCustomPrize(
    id: string,
    patch: Partial<Pick<CustomPrize, "label" | "amount">>,
  ) {
    setCustomPrizes((prev) =>
      prev.map((prize) => (prize.id === id ? { ...prize, ...patch } : prize)),
    );
  }

  function removeCustomPrize(id: string) {
    setCustomPrizes((prev) => prev.filter((prize) => prize.id !== id));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Prize structure</CardTitle>
          <CardDescription>
            Set entry fee and payouts. Add custom prize types anytime — the
            remaining pot updates as you type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-5">
            <input
              type="hidden"
              name="customPrizes"
              value={JSON.stringify(customPrizes)}
            />

            <MoneyField
              id="entryFee"
              name="entryFee"
              label="Entry fee"
              hint={`Paid by each verified manager. With ${managerCount} verified manager${managerCount === 1 ? "" : "s"} this makes a ${formatMoney(pot, currency)} pot.`}
              value={entryFee}
              onChange={setEntryFee}
            />
            <MoneyField
              id="weeklyWinner"
              name="weeklyWinner"
              label="Weekly winner"
              hint="Paid to the highest score each gameweek."
              value={weeklyWinner}
              onChange={setWeeklyWinner}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyField
                id="overall1st"
                name="overall1st"
                label="Overall 1st"
                value={overall1st}
                onChange={setOverall1st}
              />
              <MoneyField
                id="overall2nd"
                name="overall2nd"
                label="Overall 2nd"
                value={overall2nd}
                onChange={setOverall2nd}
              />
            </div>
            <MoneyField
              id="lastPlace"
              name="lastPlace"
              label="Last place prize"
              value={lastPlace}
              onChange={setLastPlace}
            />

            <div className="space-y-3 rounded-xl border border-border/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Custom prizes</p>
                  <p className="text-xs text-muted-foreground">
                    e.g. Most Improved, Highest Climb, Fun award — anything you
                    decide later.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomPrize}
                >
                  <Plus className="size-4" />
                  Add prize
                </Button>
              </div>

              {customPrizes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No custom prizes yet. Add one when you invent a new winner
                  category.
                </p>
              ) : (
                <ul className="space-y-3">
                  {customPrizes.map((prize, index) => (
                    <li
                      key={prize.id}
                      className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 sm:grid-cols-[1fr_8rem_auto]"
                    >
                      <div className="space-y-2">
                        <Label htmlFor={`custom-label-${prize.id}`}>
                          Prize name
                        </Label>
                        <Input
                          id={`custom-label-${prize.id}`}
                          value={prize.label}
                          placeholder={`Custom prize ${index + 1}`}
                          maxLength={80}
                          onChange={(e) =>
                            updateCustomPrize(prize.id, {
                              label: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`custom-amount-${prize.id}`}>
                          Amount
                        </Label>
                        <Input
                          id={`custom-amount-${prize.id}`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={prize.amount}
                          onChange={(e) =>
                            updateCustomPrize(prize.id, {
                              amount: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${prize.label || "custom prize"}`}
                          onClick={() => removeCustomPrize(prize.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={cn(
                  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
                )}
              >
                {CURRENCIES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {state && (
              <p
                className={cn(
                  "text-sm",
                  state.ok ? "text-primary" : "text-destructive",
                )}
              >
                {state.message}
              </p>
            )}

            <Button type="submit" disabled={pending} className="font-semibold">
              {pending ? "Saving…" : "Save prize config"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="size-4 text-primary" />
            Pot allocator
          </CardTitle>
          <CardDescription>
            {managerCount} verified manager{managerCount === 1 ? "" : "s"} ×
            entry fee. Unclaimed seats are not in the pot. Watch what&apos;s
            left as you assign prizes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Total pot
            </p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatMoney(pot, currency)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plannedGameweeks">Gameweeks to fund</Label>
            <Input
              id="plannedGameweeks"
              type="number"
              min="0"
              max="38"
              step="1"
              value={plannedGameweeks}
              onChange={(e) =>
                setPlannedGameweeks(
                  Math.max(0, Math.min(38, Number(e.target.value) || 0)),
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Used only for this planner (weekly × gameweeks). Default 38.
            </p>
          </div>

          <dl className="space-y-2 border-t border-border/70 pt-3 text-sm">
            <Row
              label="Entry fee"
              value={formatMoney(parseMoney(entryFee), currency)}
            />
            <Row label="Verified managers" value={String(managerCount)} />
            <Row
              label={`Weekly × ${plannedGameweeks}`}
              value={`−${formatMoney(weeklyTotal, currency)}`}
              muted
            />
            <Row
              label="Overall 1st"
              value={`−${formatMoney(parseMoney(overall1st), currency)}`}
              muted
            />
            <Row
              label="Overall 2nd"
              value={`−${formatMoney(parseMoney(overall2nd), currency)}`}
              muted
            />
            <Row
              label="Last place"
              value={`−${formatMoney(parseMoney(lastPlace), currency)}`}
              muted
            />
            {customPrizes.map((prize) => (
              <Row
                key={prize.id}
                label={prize.label.trim() || "Untitled prize"}
                value={`−${formatMoney(parseMoney(prize.amount), currency)}`}
                muted
              />
            ))}
            <Row
              label="Season + custom"
              value={formatMoney(seasonTotal, currency)}
            />
          </dl>

          <div
            className={cn(
              "rounded-xl border px-4 py-3",
              overAllocated
                ? "border-destructive/40 bg-destructive/10"
                : remaining < 0.005
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-primary/25 bg-primary/5",
            )}
          >
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Remaining in pot
            </p>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                overAllocated && "text-destructive",
              )}
            >
              {formatMoney(remaining, currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {overAllocated
                ? "Over-allocated — reduce some prizes or raise the entry fee."
                : remaining < 0.005
                  ? "Fully allocated — nice and tidy."
                  : "Still available to assign to prizes."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MoneyField({
  id,
  name,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={cn(muted ? "text-muted-foreground" : undefined)}>
        {label}
      </dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
