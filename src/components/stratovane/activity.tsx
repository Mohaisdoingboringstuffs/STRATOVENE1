"use client";

import { useEffect, useState } from "react";
import { ActivityData, api } from "@/lib/strato-api";
import { ErrorNote, Kicker, SectionTitle, TagChip } from "./ui";

export default function Activity() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .activity()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <Kicker>Activity log</Kicker>
      <SectionTitle
        sub={`Dated engineering record: audits, model changes, verifications and site updates. ${
          data?.updated ? `Last updated ${data.updated}.` : ""
        }`}
      >
        Work in the open
      </SectionTitle>

      <ErrorNote message={err} />

      {data?.note && <p className="mb-6 text-xs text-zinc-400">{data.note}</p>}

      <ol className="relative space-y-8 border-l border-zinc-200 pl-6">
        {(data?.entries ?? []).map((e, i) => (
          <li key={i} className="relative">
            <span
              aria-hidden
              className="absolute -left-[27px] top-1.5 h-2 w-2 rounded-full border-2 border-white"
              style={{
                backgroundColor:
                  e.tag === "AUDIT"
                    ? "#18181b"
                    : e.tag === "SIM"
                      ? "#ea580c"
                      : e.tag === "DOC"
                        ? "#047857"
                        : e.tag === "EXPERIMENT"
                          ? "#f59e0b"
                          : "#71717a",
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <TagChip tag={e.tag} />
              <time className="font-mono text-xs text-zinc-400">{e.date}</time>
            </div>
            <h3 className="mt-1.5 text-sm font-semibold text-zinc-950">{e.title}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-600">{e.detail}</p>
          </li>
        ))}
        {(!data || data.entries.length === 0) && !err && (
          <li className="text-sm text-zinc-400">Loading log…</li>
        )}
      </ol>
    </div>
  );
}
