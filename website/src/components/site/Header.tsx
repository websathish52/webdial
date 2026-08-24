import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import logo from "@/assets/logo/webdial-png.png";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/solutions", label: "Solutions" },
  { to: "/pricing", label: "Pricing" },
  // { to: "/master", label: "Master Console" },
] as const;

const dropdowns = [
  { label: "Resources", links: [["FAQ", "/resources#faq"], ["Help center", "/resources#help"], ["Case studies", "/resources#cases"]] },
  { label: "Integration", links: [["All integrations", "/integrations"], ["Developer API", "/integrations#api"], ["Webhooks", "/integrations#webhooks"]] },
] as const;




export function Header() {
  const [open, setOpen] = useState(false);
  const [mobileDropdowns, setMobileDropdowns] = useState<Record<string, boolean>>({});

  const toggleMobileDropdown = (label: string) => {
    setMobileDropdowns((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
<header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)]">      <div className="mx-auto flex h-[88px] max-w-7xl items-center justify-between px-5  top-0 left-0 right-0 z-50 p-0 transition-all duration-300 ">
        <a href="/" className="flex items-center gap-2">
          <img
            src={logo}
            alt="WebDial logo"
            className="h-20 w-auto object-contain drop-shadow-[0_0_18px_rgba(96,165,250,0.35)]"
          />
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <a
              key={item.to}
              href={item.to}
              className="rounded-md px-3 py-2 text-md font-medium text-[#293a51] transition-colors hover:text-ring"
           style={{    fontWeight:"500",
    fontSize: "14px"}} >
              {item.label}
            </a>
          ))}
          {dropdowns.map((menu) => (
            <div key={menu.label} className="group relative">
              <button
                type="button"
                className="flex items-center gap-1 rounded-md px-3 py-2 text-md font-medium text-[#293a51] transition-colors hover:text-ring"
                aria-haspopup="true"
              >
                {menu.label} <ChevronDown className="size-4" />
              </button>
              <div className="absolute top-full left-0 z-50 hidden min-w-44 rounded-lg border border-border bg-card p-2 shadow-lg group-hover:block">
                  {menu.links.map(([label, href]) => (
                    <a key={label} href={href} className="block rounded-md px-3 py-2 text-sm text-[#293a51] hover:bg-secondary hover:text-foreground">
                      {label}
                    </a>
                  ))}
              </div>
            </div>
          ))}
          <a
            href="/contact"
            className="rounded-md px-3 py-2 text-md font-medium text-[#293a51] transition-colors hover:text-ring"
            style={{ fontWeight: "500", fontSize: "14px" }}
          >
            Contact
          </a>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="border border-[#083ACD]/20 bg-[#083ACD]/5 px-4 py-4 text-md font-semibold text-[#083ACD] shadow-sm transition-all duration-300 hover:border-[#083ACD]/40 hover:bg-[#083ACD]/10 hover:text-[#083ACD] active:scale-95 lg:text-sm rounded-sm"
          >
            <a href="/auth">Sign in</a>
          </Button>
          <Button
            asChild
            variant="hero"
            size="sm"
            className="zoom-glow px-4 py-4 text-md font-semibold shadow-[0_10px_30px_rgba(8,58,205,0.35)] transition-all duration-300 hover:scale-[1.02] lg:text-sm"
          >
            <a href="/contact">Start free trial</a>
          </Button>
        </div>

        <button
          aria-label="Toggle menu"
          className="rounded-md p-2 text-foreground lg:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-5 py-3">
            {nav.map((item) => (
              <a
                key={item.to}
                href={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-sm text-[#293a51] hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
            {dropdowns.map((menu) => {
              const isOpen = !!mobileDropdowns[menu.label];

              return (
                <div key={menu.label} className="border-t border-border/60 py-2">
                  <button
                    type="button"
                    onClick={() => toggleMobileDropdown(menu.label)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm font-semibold text-[#293a51]"
                    aria-expanded={isOpen}
                  >
                    <span>{menu.label}</span>
                    <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="pt-1">
                      {menu.links.map(([label, href]) => (
                        <a
                          key={label}
                          href={href}
                          onClick={() => setOpen(false)}
                          className="block rounded-md px-4 py-2 text-sm text-[#293a51] hover:text-foreground"
                        >
                          {label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <a
              href="/contact"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-3 text-sm text-[#293a51] hover:text-foreground"
            >
              Contact
            </a>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="mt-3 border border-[#083ACD]/20 bg-[#083ACD]/5 px-4 py-4 text-md font-semibold text-[#083ACD] shadow-sm transition-all duration-300 hover:border-[#083ACD]/40 hover:bg-[#083ACD]/10 hover:text-[#083ACD] active:scale-95 rounded-sm"
            >
              <a href="/auth" onClick={() => setOpen(false)}>
                Sign in
              </a>
            </Button>
            <Button asChild variant="hero" className="zoom-glow mt-3 transition-all duration-300 hover:scale-[1.02]">
              <a href="/contact" onClick={() => setOpen(false)}>
                Start free trial
              </a>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
