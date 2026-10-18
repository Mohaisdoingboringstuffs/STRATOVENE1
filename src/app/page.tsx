"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Meta, api } from "@/lib/strato-api";
import Home from "@/components/stratovane/home";
import Simulator from "@/components/stratovane/simulator";
import Team from "@/components/stratovane/team";
import Activity from "@/components/stratovane/activity";
import { VaneMark } from "@/components/stratovane/ui";
import { cn } from "@/lib/utils";

type View = "home" | "simulator" | "team" | "activity";

const NAV: { key: View; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "simulator", label: "Simulator" },
  { key: "team", label: "Team" },
  { key: "activity", label: "Activity log" },
];

const REPO_URL = "https://github.com/Mohaisdoingboringstuffs/Stratovene";
const DEV_LINKS = [
  { name: "Mohaimen", url: "https://github.com/Mohaisdoingboringstuffs" },
  { name: "Abul Hasnat", url: "https://github.com/Hasnat4763" },
];

function FooterLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
      {children}
    </h3>
  );
}

const footerLink =
  "text-xs text-zinc-600 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-orange-700 hover:decoration-orange-600";

export default function Page() {
  const [view, setView] = useState<View>("home");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaErr, setMetaErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .meta()
      .then(setMeta)
      .catch((e) => setMetaErr(e.message));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-950">
      {/* ------------------------------- header ------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <button
            onClick={() => setView("home")}
            className="flex shrink-0 items-center gap-3"
            aria-label="STRATOVANE home"
          >
            <VaneMark className="h-7 w-7" />
            <span className="flex min-w-0 flex-col items-start leading-none">
              <span className="text-[15px] font-bold tracking-[0.24em] text-zinc-950">
                STRATOVANE
              </span>
              <span className="mt-1.5 hidden truncate text-[10px] uppercase tracking-[0.16em] text-zinc-400 md:block">
                Passive thermal control · stratospheric avionics
              </span>
            </span>
            <span className="ml-1 hidden shrink-0 rounded-[3px] border border-zinc-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500 lg:inline">
              Conrad Challenge
            </span>
          </button>
          <nav
            aria-label="Main"
            className="flex min-w-0 flex-1 flex-nowrap items-center justify-start overflow-x-auto sm:flex-none"
          >
            {NAV.map((n, i) => {
              const active = view === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => setView(n.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-16 shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 text-[12px] uppercase tracking-[0.08em] transition-colors sm:px-3.5",
                    active
                      ? "font-semibold text-zinc-950"
                      : "font-medium text-zinc-500 hover:text-zinc-950"
                  )}
                >
                  <span
                    className={cn(
                      "hidden font-mono text-[10px] tracking-normal sm:inline",
                      active ? "text-orange-600" : "text-zinc-400"
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {n.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-2 bottom-0 h-0.5 transition-colors sm:inset-x-3.5",
                      active ? "bg-orange-600" : "bg-transparent"
                    )}
                  />
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ------------------------------- content ----------------------------- */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {metaErr && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Model backend unreachable: {metaErr}
          </div>
        )}
        {view === "home" && <Home meta={meta} onOpenSimulator={() => setView("simulator")} />}
        {view === "simulator" && <Simulator meta={meta} />}
        {view === "team" && <Team />}
        {view === "activity" && <Activity />}
      </main>

      {/* ------------------------------- footer ------------------------------ */}
      <footer className="mt-auto border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 py-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <FooterLabel>Model status</FooterLabel>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-500">
                Preliminary engineering model, not flight-proven. Results use literature optical
                properties and assumed scenario inputs.
              </p>
              <p className="mt-2 font-mono text-[11px] text-zinc-400">
                {meta ? `model v${meta.version} · ${meta.date}` : "connecting to model…"}
              </p>
            </div>
            <div>
              <FooterLabel>Contact</FooterLabel>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <a className={footerLink} href="tel:+8801893999718">
                    +880 1893 999718
                  </a>
                </li>
                <li>
                  <a className={footerLink} href="mailto:mohaimenulhaque9000b@gmail.com">
                    mohaimenulhaque9000b@gmail.com
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <FooterLabel>Project</FooterLabel>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <a
                    className={cn(footerLink, "inline-flex items-center gap-0.5")}
                    href={REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub repository
                    <ArrowUpRight className="h-3 w-3" aria-hidden />
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => setView("activity")}
                    className={footerLink}
                  >
                    Work in the open: activity log
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-zinc-200 py-3.5 text-[11px] text-zinc-500">
            <p>
              Developed by{" "}
              {DEV_LINKS.map((d, i) => (
                <span key={d.url}>
                  {i > 0 && " and "}
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-orange-700 hover:decoration-orange-600"
                  >
                    {d.name}
                  </a>
                </span>
              ))}
            </p>
            <p className="font-mono text-[10px] text-zinc-400">
              STRATOVANE · Conrad Challenge · 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
