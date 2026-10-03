import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { HI } from "./hi"

export type Lang = "en" | "hi"
interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (s: string) => string }

const LangContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (s) => s })

/** English text is the key: t("Open dashboard") returns the Hindi string when Hindi is on, otherwise the text itself. */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return localStorage.getItem("aircouple.lang") === "hi" ? "hi" : "en" } catch { return "en" }
  })
  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem("aircouple.lang", l) } catch { /* storage unavailable */ }
  }
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  const value = useMemo<Ctx>(() => ({ lang, setLang, t: (s) => (lang === "hi" ? HI[s] ?? s : s) }), [lang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export const useT = () => useContext(LangContext)
