"use client";

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { importHistoricalData } from "@/app/admin/actions";
import type { ImportHistoricalResult } from "@/lib/history/import";
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

const DEFAULT_PATH = "Batch 2016 FPL.xlsx";

export function HistoricalImportForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportHistoricalResult | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Historical Data</CardTitle>
        <CardDescription>
          Place the workbook in <code className="text-xs">data/imports/</code>{" "}
          on the server, then enter the filename (or relative path under that
          folder). Absolute paths outside that folder are rejected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              setResult(await importHistoricalData(formData));
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="filePath">Filename under data/imports/</Label>
            <Input
              id="filePath"
              name="filePath"
              defaultValue={DEFAULT_PATH}
              placeholder="Batch 2016 FPL.xlsx"
              disabled={pending}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Importing…
              </>
            ) : (
              "Import Historical Data"
            )}
          </Button>
        </form>

        {result ? (
          <div
            className={cn(
              "space-y-3 rounded-lg border p-3 text-sm",
              result.ok
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-destructive/30 bg-destructive/5",
            )}
          >
            <p className="font-medium">{result.message}</p>

            {result.seasons.length > 0 ? (
              <ul className="space-y-1 text-muted-foreground">
                {result.seasons.map((season) => (
                  <li key={season.label}>
                    <span className="text-foreground">{season.label}</span>
                    {" · "}
                    {season.weeklyWinners} weekly winners
                    {" · "}
                    {season.seasonPrizes} season prizes
                    {season.managersCreated > 0
                      ? ` · ${season.managersCreated} new managers`
                      : ""}
                  </li>
                ))}
              </ul>
            ) : null}

            {result.warnings.length > 0 ? (
              <div className="space-y-1">
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  Warnings
                </p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
