# bug-fix-001: A single row does not fill the bed

| | |
|---|---|
| Status | Fixed (PR #4, waiting for merge) |
| Reported | 06.11.2026 |
| Branch / commit | main @ def7f70 |
| Area | Gartenplan – row form, garden map, space rules |

## Cause message
> When I create only one row in a bed, it is not filling out the bed as expected, when there are no other rows.

## Verification (agent)
- Verdict: **EXISTS** – design gap (behaves as specified, but does not meet the expectation), no crash or console error
- Steps: fresh DB → Beet 1 (4,0 × 4,0 m), season 2027 → "+ Reihe hinzufügen" → Kartoffel, "volle Reihe" → save → map
- Observed:
  - The row covers the full length (400 cm) but only 60 of 400 cm width (= one row spacing) → 15 % of the bed, 85 % stays white.
  - The form gives no way to let one planting cover several rows or the rest of the bed.
  - Workaround (typing 400 cm as width) is accepted and drawn full, but the plant count stays at one row ("volle Reihe (13 Pflanzen)" instead of ≈ 6 rows × 13 = 78), and "Anzahl Pflanzen" above 13 is rejected as too long.
  - The strawberry bed (90 cm wide) is filled, because its width equals the row spacing.
  - Side note: the map shows one day (slider, default 15.06.). Rows outside that day look like an empty bed.

## Cause
- Spec §3 / §4.1: one planting = one row, width = species row spacing. "volle Reihe" only means *full length*.
- `src/lib/components/PlantingForm.svelte:68` – default width = `rowSpacingCm`, no option for more rows.
- `src/lib/rules/space.ts:27` `plantsPerRow` and `:66` `TOO_LONG` – plant count/limit always assume a single row, even when the planting is wider.
- `src/lib/components/GardenMap.svelte` `rowRect` – draws the planting as one block, rows inside are not visible.

## Proposed fix
A planting may cover **several neighbouring rows of the same crop**. The width stays the single source of truth; the number of rows is derived from it (`rows = floor(width / rowSpacing)`, at least 1), so no schema change or migration is needed and existing data stays valid.
1. Rules (`space.ts`): `rowsInWidth()`, `plantsInPlanting()` (rows × plants per row), `freeWidthAt()` (free space from a position to the next row or the bed edge). Length check per row: `count × inRowSpacing ≤ length × rows`.
2. Row form: field "Reihen" next to the width (changing one updates the other), button **"Restliche Breite füllen"**, labels "volle Länge" and "N Reihen · M Pflanzen".
3. Map: draw thin lines between the individual rows of a multi-row planting; bed page shows "3 Reihen · volle Länge (39 Pflanzen)".
4. Spec §3/§4.1 updated.

Alternatives considered: an explicit `rowCount` column (redundant to the width, needs a migration); filling the empty bed automatically by default (surprising when several crops are planned) – both rejected.

## Report
- Result: **Successful** – a single planting can now cover several rows up to the whole bed; plant counts and limits match the covered rows; no schema change, existing rows stay valid (they keep their width → 1 row).
- Verified:
  - 4 new unit tests in `src/lib/rules/space.test.ts` (rows from width, plants over all rows, free width, count limit over all rows) – failed before the fix, pass after; 45/45 tests
  - `pnpm check` 0 errors, `pnpm build` OK
  - Reproduction re-run on a fresh DB: Beet 1 + Kartoffel → "Restliche Breite füllen" → 400 cm = 6 Reihen, "volle Länge (78 Pflanzen)", saved as "6 Reihen · volle Länge (78 Pflanzen) · 0–400 cm"; map fills the bed with row dividers; 79 plants rejected ("maximal 78"), 78 accepted; Möhre "Reihen = 3" → 75 cm; no console errors
  - Desktop (1440 px) and phone (iPhone 13) screenshots checked
- PR: https://github.com/SeronEffect/Gardenplaner/pull/4
- Open points:
  - PR #3 (tasks) also changes `savePlanting` in `src/lib/server/garden.ts` → possible small merge conflict; keep both changes.
  - The map shows a single day (slider). Rows outside that day look empty – a "ganze Saison" view could help (not part of this fix).
  - Shopping list (P5) must use `rows × length` per planting.
