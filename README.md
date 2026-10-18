# STRATOVANE website

Passive radiative thermal control for stratospheric avionics: project site with a live
heat-balance simulator, team roster and open activity log. Built for the Conrad Challenge.

## Stack

- `src/` : Next.js 16 frontend (App Router, TypeScript, Tailwind 4). All pages render here.
- `mini-services/physics-service/` : Python (Flask) physics backend on port 5001.
  US76 atmosphere, Dai-Fang sky, band radiation model, convection, enclosure solver,
  24 h transient, spectral optics, Monte Carlo + tornado sensitivity, CSIC benchmark,
  experiment CSV ingestion. `tests/` holds the pytest suite (40 tests).
- `src/app/api/sim/[...path]/route.ts` : thin proxy from `/api/sim/*` to `127.0.0.1:5001`.

## Run

1. Frontend:

   ```bash
   bun install        # or npm install
   bun run dev        # Next.js on http://localhost:3000
   ```

2. Physics backend:

   ```bash
   cd mini-services/physics-service
   python3 -m pip install -r requirements.txt
   bun run dev        # Flask on http://127.0.0.1:5001
   # (equivalent: PYTHONPATH=. python3 -m flask --app app run --host 127.0.0.1 --port 5001 --with-threads)
   ```

3. Tests:

   ```bash
   cd mini-services/physics-service && python3 -m pytest
   ```

## Editing content without code changes

- Team roster and mentor: `mini-services/physics-service/data/team.json`
- Activity log: `mini-services/physics-service/data/activity.json`
- Surface optical properties: `mini-services/physics-service/data/materials/materials.json`

Both JSON files are served verbatim by the API and rendered on the Team and Activity pages.

## Honesty notes

The model is a preliminary engineering tool, not flight-proven hardware. Convection at
altitude is an assumed input and is displayed with every result. Scenario heat loads are
assumptions. Key assumptions and limitations are listed in the UI and in
`mini-services/physics-service/main.py`.
