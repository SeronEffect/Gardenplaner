# bug-fix-001: A single row does not fill the bed

| | |
|---|---|
| Status | Open |
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
- Result: _pending_
- Verified: _pending_
- PR: _pending_
- Open points: _pending_
