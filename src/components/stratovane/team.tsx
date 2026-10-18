"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { TeamData, api } from "@/lib/strato-api";
import { ErrorNote, Kicker, SectionTitle } from "./ui";

export default function Team() {
  const [data, setData] = useState<TeamData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .team()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const anyPlaceholder = data?.members.some((m) => m.placeholder) ?? false;

  return (
    <div>
      <Kicker>The team</Kicker>
      <SectionTitle sub={data?.tagline}>Who is building STRATOVANE</SectionTitle>

      <ErrorNote message={err} />

      {anyPlaceholder && (
        <div className="mb-8 rounded-md border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
          Roster below is a template. Team pages that ship to judges must be real: edit
          <span className="mx-1 font-mono text-xs">mini-services/physics-service/data/team.json</span>
          and the site updates automatically, no code changes needed.
        </div>
      )}

      {/* mentor */}
      {data?.mentor && (
        <section className="mb-10" aria-label="Mentor">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Mentor
          </h3>
          <div className="mt-3 flex flex-col gap-4 rounded-lg border border-zinc-950 bg-white p-5 sm:flex-row sm:items-center sm:gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-950 font-mono text-base font-semibold text-white">
              {data.mentor.initials || "??"}
            </span>
            <div className="min-w-0">
              <h4 className="text-base font-semibold text-zinc-950">{data.mentor.name}</h4>
              <p className="mt-0.5 text-sm font-medium text-orange-700">{data.mentor.role}</p>
              {data.mentor.detail && (
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                  {data.mentor.detail}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* members */}
      <section aria-label="Team members">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Members</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(data?.members ?? []).map((m) => (
            <article key={m.id} className="flex flex-col rounded-lg border border-zinc-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 font-mono text-sm font-semibold text-zinc-700">
                  {m.initials || "??"}
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold leading-snug text-zinc-950">{m.name}</h4>
                  <p className="text-xs text-zinc-500">{m.role}</p>
                </div>
              </div>
              {(m.grade || m.school) && (
                <dl className="mt-4 space-y-1 border-t border-zinc-100 pt-3 text-xs">
                  {m.grade && (
                    <div className="flex gap-1.5">
                      <dt className="shrink-0 font-medium uppercase tracking-wider text-zinc-400">
                        Grade
                      </dt>
                      <dd className="text-zinc-700">{m.grade}</dd>
                    </div>
                  )}
                  {m.school && (
                    <div className="flex gap-1.5">
                      <dt className="shrink-0 font-medium uppercase tracking-wider text-zinc-400">
                        School
                      </dt>
                      <dd className="text-zinc-700">{m.school}</dd>
                    </div>
                  )}
                </dl>
              )}
              {m.focus && <p className="mt-3 text-sm leading-relaxed text-zinc-600">{m.focus}</p>}
              {m.links.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                  {m.links.map((l, i) => (
                    <a
                      key={i}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 rounded-[3px] border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-950"
                    >
                      {l.label ?? l.url}
                      <ArrowUpRight className="h-3 w-3" aria-hidden />
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
          {(!data || data.members.length === 0) && !err && (
            <p className="text-sm text-zinc-400">Loading roster…</p>
          )}
        </div>
      </section>

      {/* standing on the literature */}
      <section className="mt-14 border-t border-zinc-200 pt-10">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
          What this project stands on
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          STRATOVANE does not claim to have invented radiative cooling. It applies a documented
          materials result (anodic porous alumina on aluminum) to an enclosure problem that the
          literature shows is real and unsolved for fixed-wing HALE avionics. These are the three
          sources every claim traces back to:
        </p>
        <ol className="mt-6 space-y-4">
          {(data?.anchors ?? []).map((a, i) => (
            <li key={i} className="flex gap-4">
              <span className="font-mono text-xs text-zinc-300">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-orange-600"
                >
                  {a.label}
                </a>
                <p className="mt-0.5 font-mono text-xs text-zinc-500">{a.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
