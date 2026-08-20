"use client";

import { AnimatePresence, motion } from "framer-motion";
import { TAUNT_ACTIONS, type TauntActionId } from "@/lib/chat/taunts";
import { cn } from "@/lib/utils";

export function TauntMenu({
  targetName,
  open,
  onClose,
  onAction,
}: {
  targetName: string;
  open: boolean;
  onClose: () => void;
  onAction: (action: TauntActionId) => void;
  /** @deprecated kept for call-site compat */
  anchor?: "center" | "top" | "bottom";
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-8 z-40 flex justify-center px-3 sm:bottom-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
        >
          <div
            role="menu"
            className="pointer-events-auto w-[min(100%,22rem)] rounded-2xl border border-amber-500/30 bg-[#1a140e]/96 p-2.5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.75)] backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="truncate text-[11px] font-semibold tracking-wide text-amber-100">
                Mess with{" "}
                <span className="text-amber-300">
                  {targetName.split(" ")[0]}
                </span>
              </p>
              <button
                type="button"
                className="rounded px-1.5 text-[10px] text-white/45 hover:bg-white/10 hover:text-white"
                onClick={onClose}
              >
                Esc
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {TAUNT_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  role="menuitem"
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-2 text-center text-[10px] font-semibold text-white/90 transition-colors hover:bg-white/10",
                    action.id === "roast" &&
                      "col-span-2 border border-orange-500/35 bg-orange-950/45 text-orange-50 hover:bg-orange-900/55 sm:col-span-4 sm:flex-row sm:justify-center sm:gap-2 sm:py-2.5 sm:text-[11px]",
                  )}
                  onClick={() => {
                    onAction(action.id);
                    onClose();
                  }}
                >
                  <span className="text-base leading-none" aria-hidden>
                    {action.emoji}
                  </span>
                  <span className="leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
