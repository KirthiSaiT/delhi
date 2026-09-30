// Notion tag colours, used with shadcn <Badge className=...>
export const TONE = {
  green: "bg-[#dbeddb] text-[#1c3829]",
  yellow: "bg-[#fdecc8] text-[#402c1b]",
  orange: "bg-[#fadec9] text-[#49290e]",
  red: "bg-[#ffe2dd] text-[#5d1715]",
  blue: "bg-[#d3e5ef] text-[#183347]",
  gray: "bg-[#e3e2e0] text-[#32302c]",
} as const
export type Tone = keyof typeof TONE

export const CATS: { max: number; name: string; color: string; tone: Tone }[] = [
  { max: 50, name: "Good", color: "#1a9e4b", tone: "green" },
  { max: 100, name: "Satisfactory", color: "#7cb518", tone: "green" },
  { max: 200, name: "Moderate", color: "#e6b400", tone: "yellow" },
  { max: 300, name: "Poor", color: "#f08a00", tone: "orange" },
  { max: 400, name: "Very Poor", color: "#e5432d", tone: "red" },
  { max: 1e9, name: "Severe", color: "#8c1d40", tone: "red" },
]
export const aqiCat = (v: number) => CATS.find((c) => v <= c.max) ?? CATS[CATS.length - 1]
export const aqiColor = (v: number) => aqiCat(v).color
export const INV_COLORS = ["#d3d1cb", "#f0c95a", "#f08a00", "#e5432d"]

export function fmtTime(s: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) {
  return new Date(s).toLocaleString("en-IN", opts)
}
