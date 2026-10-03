import { useEffect, useState } from "react"
import { Loader2, Send, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { TONE } from "@/lib/aqi"
import { useT } from "@/lib/i18n"
import type { Forecast } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Answer { text: string; source: "llm" | "template"; model: string | null; note: string | null }

const SUGGESTIONS = ["Best time to go out?", "When is the worst?", "Which GRAP stage?", "Where is the air from?"]

export default function BriefingCard({ d }: { d: Forecast }) {
  const { t, lang } = useT()
  const [brief, setBrief] = useState<Answer | null>(null)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState("")
  const [ans, setAns] = useState<Answer | null>(null)
  const [asking, setAsking] = useState(false)
  const [err, setErr] = useState(false)

  const qs = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ scenario: d.scenario, lang, ...extra })
    if (d.scenario === "peak" && d.params) Object.entries(d.params).forEach(([k, v]) => p.set(k, String(v)))
    return p.toString()
  }

  useEffect(() => {
    let live = true
    setBusy(true); setErr(false); setAns(null)
    fetch(`/api/briefing?${qs()}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => live && setBrief(j))
      .catch(() => live && setErr(true)).finally(() => live && setBusy(false))
    return () => { live = false }
  }, [d.generated, d.scenario, lang, JSON.stringify(d.params)])  // eslint-disable-line react-hooks/exhaustive-deps

  const ask = (text: string) => {
    if (!text.trim()) return
    setAsking(true); setAns(null)
    fetch(`/api/ask?${qs({ q: text })}`).then((r) => (r.ok ? r.json() : Promise.reject())).then(setAns)
      .catch(() => setAns({ text: t("Could not get an answer. Is the backend running?"), source: "template", model: null, note: null }))
      .finally(() => setAsking(false))
  }

  const tag = (a: Answer) => (
    <Badge className={cn("h-5 px-2 text-[11px]", a.source === "llm" ? TONE.blue : TONE.gray)} title={a.note ?? undefined}>
      {a.source === "llm" ? `${t("AI-generated")} · ${a.model}` : t("Template summary")}
    </Badge>
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="size-4 text-primary" />{t("Today's briefing")}</CardTitle>
        <CardDescription>{t("A plain-language summary of this forecast. Numbers always come from the forecast; an AI model, if configured, only rephrases them.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t("Writing…")}</div>}
        {err && <p className="text-sm text-muted-foreground">{t("Could not load the briefing.")}</p>}
        {brief && !busy && (
          <>
            <p className="text-sm leading-relaxed">{brief.text}</p>
            <div className="flex flex-wrap items-center gap-2">{tag(brief)}
              {brief.source === "template" && brief.note && <span className="text-[11px] text-muted-foreground">{brief.note}</span>}</div>
          </>
        )}
        <div className="space-y-2 border-t pt-3">
          <div className="text-xs font-medium">{t("Ask AirCouple")}</div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <Button key={s} variant="outline" size="xs" onClick={() => { setQ(t(s)); ask(s) }}>{t(s)}</Button>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(q) }}>
            <Input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder={t("Ask about the forecast…")} aria-label={t("Ask AirCouple")} />
            <Button type="submit" size="icon" disabled={asking || !q.trim()} aria-label={t("Ask")}>{asking ? <Loader2 className="animate-spin" /> : <Send />}</Button>
          </form>
          {ans && (
            <div className="space-y-1.5 rounded-lg bg-muted p-3">
              <p className="text-sm">{ans.text}</p>
              {tag(ans)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
