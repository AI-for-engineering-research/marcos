# pi session transcript — Sensitivity dashboard

**Date:** 2026-06-15 / 2026-06-16
**Repos touched:** `pyEPM`, `AI_for_engineering/marcos`
**Scope:** New `/sensitivity` tab on the GitHub Pages site driven by a precomputed 4D pyEPM sensitivity sweep.

This is a curated transcript covering the decisions and code changes. The
verbatim turn-by-turn HTML transcript can be produced from inside pi with
`/export <path>`.

---

## 1. Recovery from a `read ETIMEDOUT`

Previous session was interrupted by a Node-level socket timeout while drafting
the dashboard plan. Resumed by re-reading the original prompt, codebase, and
existing GitHub Pages site to restore context.

## 2. Architecture decision

User confirmed the dashboard should be a **precomputed lookup**, not a
Pyodide-based live solve. Rationale:

- GH Pages is static-only.
- Each pyEPM solve takes ~13 s in CPython; would be ~5–20× slower in Pyodide.
- Precomputed cube + multilinear interpolation is fully reproducible and
  traceable per `AGENTS.md`.

Decision summary:

- **Lookup mode:** interpolate by default, snap-to-nearest as toggle.
- **Output:** Float32 binary cube + JSON manifest (sidecar pattern).
- **Site stack:** Next.js 16 static export + recharts (matching the existing
  marcos site components).
- **Tab label:** "Sensitivity".

## 3. Sweep grid

Final 4D grid (after dropping 3 T_amb nodes to fit under the cluster's
`MaxArraySize=1001` limit):

| axis | values | spacing | n |
|---|---|---|---|
| FSC [ppm] | 6 → 600 | log | 6 |
| EI_soot [#/kg-fuel] | 1e12 → 1e16 | log | 5 |
| T_amb [K] | {214, 216, 218, 220} | linear | 4 |
| N0 [kg-air/kg-fuel] | 50 → 70 | linear | 5 |

Total: **600 cases**. Cube shape `[8, 6, 5, 4, 5, 120]` (8 surrogate variables,
120 subsampled time points). Bin file size ≈ **2.20 MB**.

## 4. Code changes

### pyEPM repo

- **New** `pyepm/commands/sweep4d.py` — local sweep driver. CLI
  `pyepm-sweep4d`, supports `--quick`, `--workers N`, `--copy-to`. Pins BLAS
  threads to 1 in workers to avoid oversubscription.
- **New** `pyepm/commands/sweep_gather.py` — assembles per-case NPZs from
  the SLURM array into the cube + manifest. CLI `pyepm-sweep-gather`. Refuses
  to write a partial / corrupt cube.
- **Rewrote** `pyepm-sweep-slurm.py` — SLURM array driver. Each task does one
  in-process solve, writes a ~5 KB NPZ. Imports the grid from `sweep4d.py` so
  there is a single source of truth.
- **Modified** `pyproject.toml` — registered `pyepm-sweep4d` and
  `pyepm-sweep-gather` entry points; added `tqdm` dep.

Validation chain: every case is checked for finiteness and non-negative
number concentrations (`AGENTS.md` red flags) before being written to disk;
the gather step re-validates the assembled cube and aborts loudly on missing
cells, axis-value mismatch, or time-grid drift.

### marcos repo

- **Deleted** stale `scripts/generate-pyepm-surrogate.py` and
  `public/pyepm-sensitivity-surrogate.json` (orphaned, unreferenced).
- **New** `src/lib/sweep-data.ts` — typed Float32 cube loader, multilinear
  interpolation with axis-specific scaling (log10 for FSC/EI_soot, linear
  for T_amb/N0), JS port of `pSat_H2Ol` and `pSat_H2Os` from
  `pyepm/thermo/__init__.py` (with line refs as comments to preserve
  traceability).
- **New** `src/components/sensitivity-dashboard.tsx` — full client component
  with 4 sliders, recharts panels reproducing
  `notebooks/plotting.py:mixingLine()` and `time_series_ice()`,
  interpolate/snap toggle, frozen-parameters card, sweep-provenance card.
- **New** `src/app/sensitivity/page.tsx` — route.
- **Modified** `src/components/site-shell.tsx` — added "Sensitivity" tab.
- **Modified** `src/app/globals.css` — added `.slider-lg` class with 22 px
  thumb and 8 px track for both WebKit and Firefox engines.
- **New** `public/data/sweep_v1.bin` and `public/data/sweep_v1.json` — the
  600-case sweep cube and manifest.

## 5. End-to-end pipeline

```
[cluster]                 sbatch pyepm-sweep-slurm.py     (600 array tasks)
                          ↓
                          /home/.../array-<id>/
                              cases/case_F<F>_S<S>_T<T>_N<N>.npz   (×600)
                              cases/case_*.log                      (×600)
                              manifest_skeleton.json
                          ↓
[laptop]   rsync -av <cluster>:.../array-<id>/  /tmp/sweep_pull/
           ↓
           pyepm-sweep-gather -i .../cases -m .../manifest_skeleton.json \
               -o data --copy-to /Users/.../marcos/public/data
           ↓
           git commit + push  (in marcos)
           ↓
[GH Actions] deploy-pages.yml  → static export → upload-pages → deploy
           ↓
[live]    https://ai-for-engineering-research.github.io/marcos/sensitivity/
```

Reproducibility: serial local, parallel local (`--workers 6`), and SLURM
distributed pipelines were verified to produce **bit-exact identical cubes**
(`np.array_equal == True`).

## 6. Bugs caught and fixed during the session

1. **Stale `MaxArraySize` assumption.** Submitted `--array=0-1049`, cluster
   rejected it. Reduced T_amb axis from 7 → 4 nodes (dropped 212, 217, 219 K)
   to fit under 1001. Trade-off: dashboard slider now starts at 214 K.
2. **`np.savez` auto-extension bug** in `pyepm-sweep-slurm.py`. The atomic-
   write tmp filename was `case.npz.tmp`; numpy auto-appended `.npz` so the
   file actually written was `case.npz.tmp.npz`, and `os.replace` then failed
   with `FileNotFoundError`. Killed all 600 tasks. Fixed by using
   `case.npz.tmp.npz` as the tmp name. Resubmitted; all 600 succeeded.
3. **Initial speed estimate was off by ~22×.** The stale comment in
   `sensitivityArray.py` claimed ~0.37 s/case; actual is ~13.5 s/case.
   Mitigation: parallel `--workers 6` mode (4.4× speedup local), and the
   SLURM path runs all 600 in seconds.
4. **`time[0] = 0.0`** broke log-time plots. Fixed by skipping index 0 in
   `_subsample_indices` (the native solve echoes the initial state at t=0
   before the integrator's first step).

## 7. UI iterations after first deploy

- Slider thumbs were too small to drag → added `.slider-lg` class with a
  22 px thumb, styled separately for WebKit and Firefox.
- "Lookup mode" card overlapped sliders on narrow widths → moved to its own
  full-width row below the sliders.
- Ice plot palette (`black / darkblue / gray`) was invisible on the dark
  theme → switched to `red / blue / amber`.
- Y axis fixed to `[10⁹, 10¹⁷]` with explicit power-of-10 ticks rendered as
  Unicode superscript (`10⁹`, `10¹⁰`, …) — visually mimics `10^{N}` LaTeX
  without dragging KaTeX into the chart engine.
- X axis switched from log-auto to **linear `[0, 1]` s** with ticks every
  0.1 s, per user request. (Caveat flagged: the steep ice activation phase
  ~10⁻²–10⁻¹ s is now compressed into the leftmost ~10% of the plot.)
- Tick (10 px) and label (11 px) fonts shrunk on both panels.

## 8. Open items / scientific caveats

- **Slider lower bound on T_amb is 214 K, not 212 K** as originally specified.
  This was a cluster-imposed compromise. Re-add 212 K if the array-size
  limit can be raised on the partition.
- **Linear time axis on the ice plot** loses information past 1 s and
  compresses the activation phase. Two clean alternatives offered: linear
  `[0, 1]` s with denser ticks, or log `[10⁻³, 10⁰]` s with 4 superscript
  ticks. User has the call.
- **Interpolation is not physics.** A banner on the dashboard says so. Known
  thresholds (Schmidt-Appleman, freezing onset) can be smeared between grid
  nodes. Snap-to-nearest mode reads the raw pyEPM solves.
- **`pyepm_git_dirty: true`** on the manifest from the first cluster run
  pointed to a non-pushed commit. After pushing pyEPM the next sweep will
  produce a clean manifest hash.

## 9. Live URL

https://ai-for-engineering-research.github.io/marcos/sensitivity/
