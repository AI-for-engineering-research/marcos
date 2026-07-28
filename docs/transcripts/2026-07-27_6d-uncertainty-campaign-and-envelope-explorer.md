# Session transcript — 6-D uncertainty campaign and Kärcher envelope explorer

**Date:** 2026-07-27 / 2026-07-28
**Repos touched:** `pyEPM` (committed), `AI_for_engineering/marcos` (read only, not yet modified)
**Scope:** Design and launch a 6-parameter uncertainty campaign, and plan a website tab that shades the resulting AEI(ice)-vs-EI(soot) envelope.
**Tasks:** TASK-37 (parent), 37.1–37.5, TASK-38; closed TASK-24; docs doc-8, doc-9.
**Commits:** `8095145`, `0aef7a1`, `a64eae0`, `9f3bae5`, `25ba635`.

This is a curated transcript: the prompts in order, what was done for each, and
what was decided. Physics narrative belongs in `docs/research-log.md`; this file
records the session's shape and the engineering decisions.

---

## What we are attempting

Give a visual, honest assessment of pyEPM's parametric uncertainty in the plane
the contrail literature argues in — apparent emission index of ice against soot
emission index (the "Kärcher plot").

The deliverable is a new `/uncertainty` tab on the portfolio site where a reader
selects which values of each uncertain parameter to include, and the plot shades
the **min/max range** of AEI(ice) over everything left unselected, against the
all-defaults nominal curve and the ECLIF3/VOLCAN measured points. Soot is
deliberately not controllable — it is the x-axis.

Behind it: a full-factorial campaign over **soot × T_amb × FSC × N0 × alpha_C ×
tau_m**, 18,900 cases at 1028 sulfur bins, gathered into a small dense cube that
ships as a static asset.

---

## 1. "I would like to provide a visual assessment/sensitivity of the current uncertainties in pyEPM… use /grill-with-docs to develop a plan."

Ran the `grill-with-docs` skill (`.agents/skills/`), which is a `/grilling`
session that also produces decision docs. Established the ground facts first
rather than asking about them:

- The SLURM sweep infrastructure from TASK-35/36 already exists and already has
  registry aliases for all six parameters.
- The `alpha_C` campaign is the working precedent: 1092 cases →
  `ice_extract.csv` → `scripts/plot_alpha_C_karcher.py`, with digitised
  ECLIF3/VOLCAN overlays.
- Two hard numbers that constrain everything: **~54 s/case** at 548 bins, and
  **~36 MB/case** on disk.

Then a sequence of one-at-a-time decisions:

| Decision | Outcome |
|---|---|
| Sampling design | Trimmed full factorial — exact value-conditioning is what the fix/free UI needs; LHS breaks it, OAT has no joint envelope |
| Storage | Skip the five `*_properties.parquet` (99.4% of bytes, read by nothing downstream): 415 GB → 4.0 GB |
| Trajectory axis | `tau_m` in place of `T_exit` |
| Band semantics | min/max + nominal curve, **not** percentiles |
| Pipeline | New `pyepm-sweep-cube` on the spec-driven driver, retiring `sweep4d.py` |
| Controls | Per-parameter value multi-select (all = free, one = fixed) |
| Tab v1 | Envelope + nominal + measurement overlay |

Two findings during the grilling changed the design:

**`T_exit` and `N0` are not degenerate, but act on disjoint parts of the state.**
Measured, not assumed: at fixed pressure `rhoAir` and `rhoMolec` both go as
`1/T`, so `T_exit` cancels **exactly** out of every mixing ratio (ratio 1.000000
for `Tc0` 600→650, against 0.923077 for `N0` 60→65). `T_exit` reaches only the
per-cm³ number densities via `set_pdf` and the K15 anchor. Recorded as **doc-8**.

**A correction I had to make mid-grilling.** I priced swapping in `tau_m` as
costing new plumbing. It does not: `tau_m`/`beta` were already threaded from
`parameters.py:104-105` through `ivp.py:196-197`, with the `trajectory.py`
constants as fallbacks only. They looked hardcoded because the *keys* were
absent from `epm-only-input.yaml` — which did matter, because `submit_sweep.py`
refuses to sweep a key the base input lacks.

## 2. Clarification requests (two), and a wrong turn worth recording

The user twice asked to clarify rather than answer, which caught a real error.

I had raised TASK-24's Implementation Notes as a blocker — they report that
correcting the latched water activity "removes ~ALL sulfur ice (~15 orders of
magnitude)", which would have made the low-soot band a picture of a bug. The
user said TASK-24 was outdated.

Checking `docs/research-log.md` confirmed they were right. TASK-25 explicitly
**retracts** that reading, and TASK-26 landed the committed fix (phantom `d_wet`
reset, commit `064854e`, regression test in `tests/test_epm.py`). Net across
TASK-24/25/26: **6.27e17 → ~2.1e16**, flat in time, timestep-convergent, within
~2× of Yu2024 Case 1. The figure I quoted describes an instant-equilibration
variant the log itself calls an over-correction.

I had been reading stale task metadata instead of the log. This is why TASK-24
was later closed with a correction note (§6).

A second error, self-caught: I claimed `alpha_C` drove the band by "13 decades",
computed from a median across all 7 campaign arrays — which mixes FSC=3 (HEFA,
legitimately ~zero sulfur ice) with FSC=505. Redone per-campaign, the real
result is more interesting and reshaped the grid:

```
spread across alpha_C at EI_soot=1e12
FSC=3     1.8x     FSC=192     62x
FSC=7     1.9x     FSC=211   1021x   <- peak
FSC=75    1.8x     FSC=505     54x
FSC=125  13.9x
```

`alpha_C`'s influence is an **interaction with FSC**, non-monotonic, peaking near
FSC≈200 — so FSC=200 was added to the grid. This also vindicates the
full-factorial choice: OAT would have missed it entirely.

Campaign-data provenance was verified rather than assumed: rerunning
`alpha_C=0.05, FSC=505, T=215.8` on current code reproduces the stored CSV to
0.05%, so it is post-TASK-26 and safe to reason from.

## 3. "I want T_amb to be 211, 213, 215, 217, 219, 221, 223"

Seven points instead of four. Re-costed, then measured the grid choice instead of
extrapolating it (user had specified 1000 log bins):

```
N_LOG   bins   wall     total_ice
  520    548   54.7 s   2.0346e16
  800    828   89.2 s   2.0740e16
 1000   1028  133.3 s   2.0825e16
```

Reproduces doc-7's table closely. 1028 bins costs **2.44×** the 548-bin case;
+2.35% on total ice from 548, still +0.4% above 828 — consistent with doc-7's
"never plateaus", but percent-level against a band that is decades wide.

Final grid, every axis containing its baseline so the nominal curve is a real
grid member:

```
soot     15  logspace(11,16)              N0        3  50, 60*, 70
T_amb     7  211,213,215*,217,219,221,223 alpha_C   4  1.0*, 0.4, 0.1, 0.05
FSC       5  3, 100, 200, 500, 1350*      tau_m     3  7e-3, 1e-2*, 1.4e-2
                        18,900 cases · ~700 core-h · 4.0 GB
```

## 4. "will you set yaml in the current slurm framework so I can submit on hex?"

Confirmed yes, and verified the spec schema rather than describing it from
memory. Found a correction to what I had shown earlier: `write_properties` must
be a **top-level** spec key, not a `fixed:` entry — `fixed:` resolves aliases
against `epm-only-input.yaml` via `find_key_path`, and it is not a model key.

Flagged the ordering hazard that mattered most: spec keys are read with
`.get(default)`, so an unimplemented key would **silently no-op** and produce the
415 GB campaign with a zero exit status.

## 5. "will this run save ice data classified by aerosol type?"

Verified rather than asserted. All eight ice columns are in `states.parquet`,
which is kept in full under `write_properties: false`. Confirmed the
decomposition, which matters for the planned mode selector:

- `soot + sulfur + ambient = total`, exact to 4.4e-16 — the partition.
- `sulfur_positive + sulfur_negative = sulfur_charged`, and `sulfur_charged` is a
  **subset** of `sulfur` (median 32%), not a fourth term. Adding it to the
  partition double-counts.

Decided to store all 8 variables in the cube (605 kB vs 76 kB for `total` alone)
so the deferred total/soot/sulfur/ambient selector needs no re-gather.

## 6. "go ahead with phase 1 and the dry run. commit and push"

**Commit `8095145`** — four prerequisites:

1. `epm-only-input.yaml` names `Jet mixing time tau_m [s]` and `Jet dilution
   exponent beta [-]` at the values they already defaulted to. Baseline
   numerically unchanged (`2.034553e16`, against `2.0346e16` measured before).
2. `Solution.write(..., include_properties=False)` and a tolerant `Solution.read`
   returning `None` for omitted frames.
3. The worker honours it via a top-level `write_properties` spec key, recorded in
   `manifest.json` and printed by `--dry-run`.
4. **Unknown top-level spec keys rejected** — closing the silent-no-op hazard.
   Verified through the real CLI: a typo'd key exits 2 listing the valid ones.

Nine new tests; local dry-run resolved 18,900 cases across 19 chunks.

**Commit `0aef7a1`** — filed TASK-37.2/37.3/37.4, recorded the decision table on
TASK-37, wrote **doc-8** and **doc-9**, and closed **TASK-24** with a note
stating the retraction and the real arc, so its stale text cannot mislead again.

## 7. Submission failure 1 — `MaxJobCount`

> "my jobs were cancelled: sbatch: error: Batch job submission failed: Resource temporarily unavailable"

Requested cluster limits. `MaxJobCount = 10000`; the campaign asked for **19,000**
job records. Array tasks count against it individually, it is cluster-wide and
shared, and `EAGAIN` here is a hard limit wearing a transient-looking message —
no retry or backoff could ever work. TASK-36's chunking addresses `MaxArraySize`,
a *different* limit, and if anything makes this one worse.

**Commit `a64eae0`** — `cases_per_task`. One array task runs a contiguous slice
of the global case index: 18,900 cases at 10 per task is **1,890** job records in
2 arrays. Two invariants held deliberately:

- **Bundling moves no case.** Case 1000 is the same case in the same directory,
  bundled or not, so a bundled rerun stays comparable.
- **A failing case does not take its bundle.** At 10-per-task a raise would
  discard nine good runs; the task finishes the rest and exits non-zero naming
  the failed case ids.

Walltime 00:30 → 01:00 (10 × ~133 s ≈ 22 min), headroom deliberate because a
walltime kill takes the bundle's remaining cases and leaves no per-case record.

Verified with 18 unit tests on the index math **and a real local worker run** —
task→case mapping, per-case log redirect/restore, and a forced mid-bundle
failure. Incidental find filed as **TASK-38**: duplicate values within one axis
collide in one case directory and silently overwrite.

## 8. Submission failure 2 — invisible startup errors

> "I am seeing some failed cases.."

`sacct` showed **1001 FAILED, exit 1:0, 00:00:02 each**, no `MaxRSS`. Nothing ran;
they died at startup. And the reason was nowhere on disk.

That was my defect: bundling moved the pyepm import ahead of the first case's log
redirect, so startup failures wrote to the job's stderr — which the worker's
`#SBATCH --error=/dev/null` discards.

**Commit `9f3bae5`** — array tasks write to
`<run_dir>/slurm-logs/task-%A_%a.err`, created before submission because Slurm
drops the log silently if the directory is missing. Also corrected two labels in
the submit output that said "cases" while printing task counts.

Measured peak RSS at 1028 bins (1.03 GB against `mem: 4000M`) to rule out OOM.

## 9. Submission failure 3 — the actual bug

> "ModuleNotFoundError: No module named 'sweep_common'" at `/var/spool/slurm/d/job614086/slurm_script`

**Slurm does not execute a submitted script in place.** It copies it to the
node's spool directory and runs the copy, so under `sbatch` `__file__` is that
copy and its directory holds nothing else. `sys.path.insert(0,
dirname(__file__))` therefore finds no `sweep_common`.

Latent from TASK-35's spec-driven rewrite, not from bundling: the alpha_C
campaign ran on the old hand-edited worker, so the current one had **never run
under sbatch at all**. Bundling only changed which line it died on.

Reproduced locally by copying the worker to another directory and running it from
there — the one thing that reproduces it, and the one thing no previous test did.

**Commit `25ba635`** — `submit_sweep.py` exports `PYEPM_SWEEP_BINDIR` (it built
the worker path, so it knows the directory); the worker prefers it and keeps
`__file__` as the fallback for direct invocation. A missing export names the
spool copy, the directory searched, and why the variable would be unset. Three
new tests, including one that runs the worker from a copy.

Campaign is running.

---

## Status

| | |
|---|---|
| TASK-37.1 prerequisites | **Done** |
| TASK-37.5 case bundling | **Done** |
| TASK-37.2 run the campaign | **In flight** on hex |
| TASK-37.3 `pyepm-sweep-cube` | To do |
| TASK-37.4 `/uncertainty` tab | To do |
| TASK-38 duplicate axis values | To do (robustness, not blocking) |

Test suite 256 passing (was 235 at session start).

## Carried caveats

- **`tau_m = [7e-3, 1e-2, 1.4e-2]` is an assumed ±40% spread with no identified
  source.** Labelled as such in the spec and the manifest. Needs a citation
  before it reaches the manuscript — the campaign's weakest link.
- **The band is a range, not a probability** (doc-9). Label it "min/max over the
  swept parameter range" wherever it appears.
- **Grid residual** is percent-level at 1028 bins and never plateaus (doc-7).
  Negligible against a decades-wide band; still worth a footnote.
- Timing (~133 s/case) was measured on a laptop; hex's per-core speed will move
  the 700 core-h estimate.

## Lesson worth keeping

Three submission round-trips were spent on infrastructure, and the sequencing
cause is the same each time: **the worker was only ever tested the way it is
convenient to run, not the way SLURM invokes it.** Running it directly gives a
real `__file__` and no spool copy, which is precisely the mode in which the
`sweep_common` bug cannot appear; the `--output=/dev/null` refactor then hid the
error for a further cycle. The test added in `25ba635` runs the worker from a
copy, which is the shape any future change to it should be checked against.
