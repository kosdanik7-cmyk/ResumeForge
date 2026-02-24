# Admission Navigator (ResumeForge)

Premium, responsive admission intelligence app with:

- Dual typeahead search (school + program) with fuzzy matching, keyboard nav, did-you-mean, and filtering.
- Program Snapshot with prerequisite cards, minimum/competitive averages, acceptance rates, and rankings.
- Source links + "last verified" metadata and clear "Not published" handling.
- My Grades planner with course rows, predicted marks, top-6/prereq averages, transparent breakdown, and Admission Fit estimate.
- Caching-first backend with pre-indexed JSON dataset and API payloads split for autocomplete vs snapshot.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Data pipeline design

- `data/index.json` acts as the search index output (canonical school/program IDs, schema versioned).
- Incremental refresh jobs can rewrite the index daily/weekly by source volatility.
- Source priority is enforced in API metadata: official program/admission pages first, then ranking datasets, then permitted scraping.
