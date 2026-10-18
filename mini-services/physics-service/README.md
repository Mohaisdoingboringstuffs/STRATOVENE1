# STRATOVANE — Thermal Model & Website

Live simulator for the STRATOVANE passive radiative cooling concept
(anodic porous alumina on a stratospheric avionics enclosure).

## Architecture

```
┌─ Next.js 16 frontend (TypeScript, Tailwind, shadcn/ui, Recharts)
│    Home · Simulator · Team · Activity log  —  single-page views
│    all model calls go through /api/sim/* (Next route handlers)
│            │
│            ▼ proxy (127.0.0.1:5001)
└─ Python Flask physics service (this directory's model modules)
     numpy · scipy heat-balance solver, 3-node enclosure model
     US76 atmosphere · spectral/broadband sky · NOAA solar position
```

The physics stays in Python — the validated solver must not be rewritten
in another language. The frontend is presentation only.

## Running

Frontend (from the repository root's parent Next.js project):
```bash
bun run dev          # port 3000
```

Physics service (this directory):
```bash
./run.sh             # Flask on 127.0.0.1:5001
# or: PYTHONPATH=. python3 -m flask --app app run --port 5001
```

## API (all JSON, served on :5001, proxied at /api/sim/*)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/meta` | GET | version, ranges, materials with α/ε, limitations |
| `/api/altitude` | POST | steady state per material at one altitude (+ scenario strip: T_air, T_sky, p/ρ ratios) |
| `/api/sweep` | POST | altitude sweep 0–25 km for the T-vs-altitude chart |
| `/api/transient` | POST | 24 h day–night cycle, overcool/overheat flags |
| `/api/spectral` | POST | ε(λ), R(λ) for the spectral view |
| `/api/montecarlo` | POST | background MC job (poll `/api/jobs/<id>`) |
| `/api/sensitivity` | POST | one-at-a-time tornado |
| `/api/benchmark` | POST | Díaz-Lobo 2024 reproduction with documented definition mismatches |
| `/api/experiment` | POST | CSV upload + model-vs-measurement metrics |
| `/api/team` | GET | roster — **edit `data/team.json`** (currently placeholder) |
| `/api/activity` | GET | dated activity log — **edit `data/activity.json`** |

## Editing team / activity content

No code changes needed:
- `data/team.json` — members, roles, advisors, source anchors
- `data/activity.json` — dated log entries (newest first)

## Honesty rules (enforced by the codebase)

- Every parameter carries a Status: MEASURED / LITERATURE / STANDARD
  ATMOSPHERE / DERIVED / ASSUMED / USER INPUT (see `parameters.py`).
- Convection is displayed with every result — it is the biggest lever
  at altitude (h ≈ 4.7 W/m²K at 5 m/s / 20 km).
- The 0 °C electronics lower limit is checked, not just overheating.
- The benchmark reports definition mismatches instead of tuning them away.

## Tests

```bash
PYTHONPATH=. python3 -m pytest tests/    # 40 tests
```
