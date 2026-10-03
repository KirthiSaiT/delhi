import { Activity, Flame, Layers3, Menu, Wind } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useT, type Lang } from "@/lib/i18n"

const PRODUCT = [
  { href: "#dashboard", icon: Activity, title: "72-hour forecast", desc: "AQI, PM2.5, PM10, NO₂ and O₃ across 20 NCR stations." },
  { href: "#how", icon: Wind, title: "Two-way feedback", desc: "Aerosols dim sunlight, the PBL shrinks, PM2.5 rises." },
  { href: "#how", icon: Layers3, title: "Inversion tracker", desc: "Strength, PBL height and ventilation, hour by hour." },
  { href: "#how", icon: Flame, title: "Stubble plume", desc: "Fire detections carried to Delhi by the forecast wind." },
]
const RESOURCES = [
  { href: "#accuracy", title: "Model accuracy", desc: "Held-out stubble-season skill scores." },
  { href: "#replay", title: "Replay a real episode", desc: "Nov 2025 forecasts vs what actually happened." },
  { href: "#validate", title: "Check our work", desc: "Errors by lead time, station and AQI category." },
  { href: "#faq", title: "Method & limitations", desc: "What is real, what is emulated." },
  { href: "/docs", title: "Open API docs", desc: "The forecast as JSON and CSV for your own tools." },
]
const MOBILE: [string, string][] = [["#dashboard", "Dashboard"], ["#how", "How it works"], ["#accuracy", "Accuracy"], ["#validate", "Check our work"], ["#faq", "Method & limitations"], ["/docs", "Open API docs"]]

export function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2.5">
      <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background"><Wind className="size-4.5" /></div>
      <span className="text-[15px] font-bold tracking-tight">AirCouple</span>
    </a>
  )
}

function LangSwitch() {
  const { lang, setLang } = useT()
  return (
    <ToggleGroup variant="outline" size="sm" spacing={0} value={[lang]} onValueChange={(v) => v[0] && setLang(v[0] as Lang)} aria-label="Language">
      <ToggleGroupItem value="en" className="aria-pressed:bg-primary aria-pressed:text-primary-foreground data-pressed:bg-primary data-pressed:text-primary-foreground">EN</ToggleGroupItem>
      <ToggleGroupItem value="hi" className="aria-pressed:bg-primary aria-pressed:text-primary-foreground data-pressed:bg-primary data-pressed:text-primary-foreground">हिं</ToggleGroupItem>
    </ToggleGroup>
  )
}

export default function Nav({ onOpen }: { onOpen: () => void }) {
  const { t } = useT()
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-4">
        <Logo />
        <NavigationMenu className="mx-auto hidden md:flex" align="center">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>{t("Product")}</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[420px] gap-1 p-1">
                  {PRODUCT.map((p) => (
                    <li key={p.title}>
                      <NavigationMenuLink href={p.href} className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-muted">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"><p.icon className="size-4" /></span>
                        <span><span className="block text-sm font-medium">{t(p.title)}</span><span className="block text-xs text-muted-foreground">{t(p.desc)}</span></span>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>{t("Resources")}</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[340px] gap-1 p-1">
                  {RESOURCES.map((p) => (
                    <li key={p.title}>
                      <NavigationMenuLink href={p.href} className="block rounded-lg p-2.5 hover:bg-muted">
                        <span className="block text-sm font-medium">{t(p.title)}</span>
                        <span className="block text-xs text-muted-foreground">{t(p.desc)}</span>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem><NavigationMenuLink href="#how" className={navigationMenuTriggerStyle()}>{t("How it works")}</NavigationMenuLink></NavigationMenuItem>
            <NavigationMenuItem><NavigationMenuLink href="#accuracy" className={navigationMenuTriggerStyle()}>{t("Accuracy")}</NavigationMenuLink></NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <LangSwitch />
          <Button variant="ghost" className="hidden lg:inline-flex" nativeButton={false} render={<a href="#faq" />}>{t("Method")}</Button>
          <Button onClick={onOpen} className="hidden h-9 px-3.5 sm:inline-flex">{t("Open dashboard")}</Button>
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" />}>
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader><SheetTitle><Logo /></SheetTitle></SheetHeader>
              <div className="flex flex-col gap-1 px-4">
                {MOBILE.map(([h, l]) => (
                  <SheetClose key={h} nativeButton={false} render={<a href={h} className={cn(buttonVariants({ variant: "ghost" }), "h-10 justify-start text-base")} />}>{t(l)}</SheetClose>
                ))}
                <Separator className="my-2" />
                <SheetClose render={<Button className="h-10 text-base" onClick={onOpen} />}>{t("Open dashboard")}</SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
