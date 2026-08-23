/** Dressing Room interactive taunts — broadcast-only, no DB. */

export const TAUNT_ACTIONS = [
  {
    id: "slap",
    label: "Slap",
    emoji: "👋",
    float: "SLAP!",
    description: "A crisp locker-room slap",
  },
  {
    id: "kick",
    label: "Kick",
    emoji: "🦶",
    float: "YEET!",
    description: "Boot to the shin",
  },
  {
    id: "tease",
    label: "Tease",
    emoji: "😏",
    float: "lol",
    description: "Petty little dig",
  },
  {
    id: "laugh",
    label: "Point & Laugh",
    emoji: "👉😂",
    float: "HAHA",
    description: "Point and cackle",
  },
  {
    id: "bottle",
    label: "Throw Bottle",
    emoji: "🧴",
    float: "BOTTLE!",
    description: "Plastic missile",
  },
  {
    id: "boo",
    label: "Boo",
    emoji: "👎",
    float: "BOOO",
    description: "Crowd turns",
  },
  {
    id: "clap",
    label: "Slow Clap",
    emoji: "👏",
    float: "…clap",
    description: "Sarcastic applause",
  },
  {
    id: "roast",
    label: "Send Roast",
    emoji: "🔥",
    float: "ROASTED",
    description: "Open the curse channel",
  },
] as const;

export type TauntActionId = (typeof TAUNT_ACTIONS)[number]["id"];

export type TauntEvent = {
  id: string;
  action: TauntActionId;
  fromManagerId: number;
  fromName: string;
  toManagerId: number;
  toName: string;
  at: number;
};

export function tauntMeta(action: TauntActionId | string) {
  return (
    TAUNT_ACTIONS.find((item) => item.id === action) ?? {
      id: "tease" as TauntActionId,
      label: "Taunt",
      emoji: "😏",
      float: "!",
      description: "A locker-room jab",
    }
  );
}

export function makeTauntId() {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
