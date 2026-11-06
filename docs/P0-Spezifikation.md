# Gardenplaner – Phase 0: Specification

Status: v5 · 04.11.2026 (v2: clean start, environment data §8 · v3: plant data with sources §5 · v4/v5: sensor hardware FYTA §8.2)
Scope: data model, rules engine, starting plant data, screens. No code yet.

---

## 0. Decisions so far

| Topic | Decision |
|---|---|
| Users | Single user, simple password login (so it can go online later) |
| Devices | Desktop = planning · phone = "Gartenmodus" (tasks, ticking off, harvest log, quick edits), PWA |
| UI language | **German only.** Code and DB stay in English. All UI text in one file (`de.ts`). Dates `dd.MM.yyyy`, weeks shown as "KW 45", starting Monday |
| Placement | **Rows**: a planting is one row in a bed (count or full row) |
| Row direction | Same within a bed; set per bed (horizontal or vertical on the 2D map) |
| Pre-culture | Locations: **Fensterbank**, **Gewächshaus** |
| Greenhouse | Is also a **bed** (tomato, cucumber, pepper, chilli), rotation mode "warning only" |
| Varieties | Optional; plan by species, add a variety when you give one |
| Fertilizing | Generic, by feeding type |
| Extras | Bed history, succession growing, shopping list (no stock), green manure, storage tips |
| Plant card | One side, long format, all German |
| History | Season 2026 is entered as history (you place the plants yourself later) |
| Stack | TypeScript end to end: SvelteKit + Drizzle ORM + **Postgres**, Docker (see §8) |
| Environment data | Weather (Open-Meteo) + sensors (air/soil temperature, humidity, light) planned now, built in P7 |

---

## 1. Glossary (UI ↔ code)

| UI (DE) | Code | Meaning |
|---|---|---|
| Pflanzenart | `Species` | e.g. Tomate |
| Sorte | `Variety` | e.g. 'Linda' (optional) |
| Pflanzenfamilie | `Family` | Basis for rotation |
| Nährstoffbedarf | `feedingType` | Starkzehrer / Mittelzehrer / Schwachzehrer |
| Anbauweg | `CultureRoute` | e.g. "Vorkultur Fensterbank" or "Direktsaat" |
| Arbeitsschritt | `CultureStep` | Rule that produces tasks |
| Beet | `Bed` | Includes the greenhouse |
| Pflanzung / Reihe | `Planting` | One row of one crop over a date range |
| Satzfolge | `SuccessionSeries` | Repeated sowing (e.g. lettuce every 3 weeks) |
| Saison | `Season` | Garden year |
| Aufgabe | `Task` | Calendar entry |
| Tagebuch | `LogEntry` | Harvest, note, problem, soil test, photo |
| Einkaufsliste | `ShoppingItem` | What to buy, generated from the plan |
| Gründüngung | `Species.isGreenManure` | Phacelia, Gelbsenf |

---

## 2. Entity diagram

```mermaid
erDiagram
  Settings ||--o{ Bed : "Garten"
  Family ||--o{ Species : has
  Species ||--o{ Variety : has
  Species ||--o{ CultureRoute : "Anbauwege"
  CultureRoute ||--o{ CultureStep : steps
  Species ||--o{ Companion : "A"
  Species ||--o{ Companion : "B"
  Season ||--o{ Planting : "geplant in"
  Bed ||--o{ Planting : rows
  Species ||--o{ Planting : ""
  Variety |o--o{ Planting : optional
  CultureRoute ||--o{ Planting : "chosen route"
  SuccessionSeries |o--o{ Planting : creates
  Planting ||--o{ Task : creates
  Bed |o--o{ Task : ""
  Planting |o--o{ LogEntry : ""
  Bed |o--o{ LogEntry : ""
  Season ||--o{ ShoppingItem : ""
  Species ||--o{ ShoppingItem : ""
  Bed |o--o| SensorDevice : "one per bed"
  SensorDevice ||--o{ Reading : raw
  SensorDevice ||--o{ ReadingHourly : aggregated
  EnvRule ||--o{ Alert : triggers
  Alert |o--o| Task : creates
  Bed |o--o{ Alert : ""
```

---

## 3. Entities

### Settings (one row)
`gardenName`, `lat`, `lon` (Braunschweig area), `lastFrost` (MM-DD, default **05-15**, after the Eisheiligen), `firstFrost` (default **10-15**), `passwordHash` (P6). Greenhouse dates are stored per culture route (own windows, see §5) instead of a global lead time.

### Family
`id`, `nameDe`, `nameLat`, `rotationPauseYears` (default 3; Rosengewächse 4).

### Species
| Field | Type | Note |
|---|---|---|
| `slug`, `nameDe`, `nameLat` | text | |
| `familyId` | FK | |
| `feedingType` | enum `HEAVY \| MEDIUM \| LIGHT \| NONE` | NONE = green manure |
| `lifecycle` | enum `ANNUAL \| PERENNIAL` | |
| `lifespanYears` | int? | perennials: how many years they stay in the bed |
| `heightCm`, `widthCm` | int range | for the plant card + tall plants on the north side |
| `rowSpacingCm` | int | = width of a row in the bed |
| `inRowSpacingCm` | int | → number of plants per row |
| `toxicityLevel` | enum `NONE \| CAUTION \| TOXIC` | |
| `toxicityDe` | text? | |
| `careDe`, `storageDe` | text | |
| `fertilizeIntervalDays` | int? | overrides the feeding-type default |
| `defaultSourcing` | enum `SEED \| SEEDLING \| SETS \| EXISTING` | SETS = onion sets / seed potatoes |
| `setWeightG` | int? | seed potato ≈ 60 g → kg for the shopping list |
| `outdoor`, `greenhouse` | bool | where it can grow |
| `isGreenManure` | bool | |
| `imageUrl`, `imageCredit`, `imageLicense` | text | Wikimedia Commons |
| `sourceRef` | text | source of the values (e.g. `BZfE`, `BUND`, `Sec:Plantura`), also on CultureStep and Companion |

### Variety (optional)
`speciesId`, `nameDe`, `daysToMaturity?`, `notesDe`, `overrides` (JSON: spacing, timing).

### CultureRoute / CultureStep
A species has 1..n **routes** (Gurke: "Vorkultur Fensterbank" | "Direktsaat"). Each route is an ordered list of **steps**:

| Field | Type |
|---|---|
| `type` | `PRESOW \| PRICK_OUT \| PRESPROUT \| HARDEN_OFF \| DIRECT_SOW \| PLANT_OUT \| CARE \| FERTILIZE \| PRUNE \| HARVEST \| CLEAR` |
| `location` | `WINDOWSILL \| GREENHOUSE \| BED` |
| `anchor` | `LAST_FROST \| FIRST_FROST \| PLANTING_START \| PREV_STEP \| FIXED_MMDD` |
| `offsetStartDays`, `offsetEndDays` | int (time window relative to the anchor) |
| `repeatEveryDays` | int? (e.g. pinching out side shoots weekly) |
| `labelDe` | text ("Tomaten pikieren") |
| `isPlantingStart` / `isPlantingEnd` | bool – marks when the row in the bed becomes taken and free again |

### Companion
`speciesAId < speciesBId`, `relation GOOD | BAD`, `reasonDe`.

### Bed
`name`, `type FLAT | RAISED | GREENHOUSE | POTS`, `xCm`, `yCm`, `lengthCm`, `widthCm`, `rowDirection HORIZONTAL | VERTICAL`, `rotationMode STRICT | WARN | OFF`, `sun FULL | PARTIAL | SHADE`, `soilDe`, `active`.
Rows always run **along `lengthCm`**; they are stacked across `widthCm`.

### Season
`year`, `status HISTORY | PLANNING | ACTIVE | ARCHIVED`. 2026 = HISTORY.

### Planting (= one or more neighbouring rows of one crop)
| Field | Note |
|---|---|
| `seasonId`, `bedId`, `speciesId`, `varietyId?`, `routeId` | |
| `offsetCm` | position across the bed (from the top/left edge) |
| `widthCm` | default = `rowSpacingCm`; a wider planting covers several rows: `rows = floor(widthCm / rowSpacingCm)`, at least 1 (bug-fix-001) |
| `quantityMode` | `FULL_ROW \| COUNT` |
| `count?` | for COUNT; row length = count × `inRowSpacingCm` |
| `startDate`, `endDate` | time the row is taken in the bed (calculated from the route, can be moved by hand) |
| `endSeasonYear?` | perennials: last year it stays |
| `sourcing` | from the species, can be changed |
| `status` | `PLANNED \| ACTIVE \| DONE` |
| `successionSeriesId?` | |
| `notesDe` | |

### SuccessionSeries
`speciesId`, `bedId`, `offsetCm`, `firstDate`, `intervalDays`, `count` → creates n plantings (in the same row one after another, or in neighbouring rows).

### Task
`plantingId?`, `bedId?`, `type`, `location`, `titleDe`, `dueStart`, `dueEnd`, `status OPEN | DONE | SKIPPED`, `doneAt?`, `generatedKey?` (unique; null = manual), `notesDe`.

### LogEntry
`date`, `plantingId?`, `bedId?`, `type HARVEST | NOTE | PROBLEM | SOIL_TEST | PHOTO`, `amount?`, `unit? (kg | Stück | Bund)`, `textDe`, `photoPath?`, `ph?`.

### ShoppingItem
`seasonId`, `speciesId`, `varietyId?`, `kind SEED | SEEDLING | SETS | GREEN_MANURE`, `quantity`, `unit`, `bought bool`, `generated bool`.

---

## 4. Rules engine (package `@garden/rules`, runs in the browser and on the server)

**Overlap:** two plantings overlap ⇔ same bed ∧ the ranges `[offset, offset+width]` intersect ∧ the date ranges intersect.

### 4.1 Space check
- `offsetCm + widthCm ≤ bed.widthCm`
- no overlap with another planting
- COUNT: `count ≤ rows × floor(lengthCm / inRowSpacingCm)`
- FULL_ROW ("volle Länge"): `count = rows × floor(lengthCm / inRowSpacingCm)`
- The row form offers "Reihen" and "Restliche Breite füllen" (free width from the position to the next row or the bed edge)

### 4.2 Crop rotation
For a new planting P in bed B, take every planting H with the same position across the bed and an `endDate` within the last `family.rotationPauseYears` years:
- `H.family == P.family` → **STRICT: blocked · WARN: warning + task "Erde tauschen / Kompost" · OFF: no check**
- Score for feeding order (heavy → medium → light → green manure → heavy): previous main crop is the expected predecessor = +2, same feeding type again = −1.
- Perennials (Erdbeere, Himbeere) stay in place for every year they span → they block the space and are not rotated.
- *(P4)* Checked in both directions (what grew here before and what is planned later); "frei ab" = end of the earlier crop + pause.
- *(P4)* Exception: the **same species again in the same season** (succession, re-sowing) is not a conflict. Another species of the family still is (Gelbsenf after Radieschen).
- *(P4)* Rows in a HISTORY season are never blocked, only warned (history is what really happened).
- *(P4)* Feeding order uses the last main crop on the space within ~1.5 years; green manure is skipped as predecessor. Expected: Stark ← Schwach/Gründüngung, Mittel ← Stark, Schwach ← Mittel.
- *(P4)* WARN/STRICT: a planting that follows the same family gets the task "Erde tauschen / Kompost einarbeiten" in the 2 weeks before planting.
- Code: `src/lib/rules/rotation.ts`; shown live in the row form (red = blocked, orange = warning, green = good).

### 4.3 Neighbours
Rows **directly next to each other** in the same bed (gap between row edges ≤ 10 cm) that overlap in time:
`GOOD` +1 · `BAD` −3 + warning. Shown live while dragging.
*(P4)* Same species next to each other is ignored; several sets of one crop count once. Bad neighbours warn but never block.

### 4.4 Task generation
- Each `CultureStep` of a planting's route → task with a window `[anchor+offsetStart, anchor+offsetEnd]`.
- `anchor` = Settings frost dates, a fixed date, the planting's start date, or the previous step. Greenhouse routes have their own windows (§5).
- Repeating steps (`repeatEveryDays`) → one task per interval between plant-out and harvest end.
- Fertilizing by feeding type: Starkzehrer every 14 days · Mittelzehrer every 28 days · Schwachzehrer once at planting · Gründüngung none.
- **Idempotent:** `generatedKey = plantingId:stepId:n`. When dates are recalculated, open tasks move with the planting; DONE/SKIPPED stay unchanged.
- Week view = tasks whose window touches the week, grouped by location (Fensterbank / Gewächshaus / Beet X).

### 4.5 Green manure
When a planting is set to DONE (or the planner finds a free space) and the gap until the next planting is ≥ 6 weeks:
- Suggest a green manure that fits the season (Phacelia A. Apr–E. Mai / A. Aug–E. Sep, Gelbsenf Aug–A. Okt).
- **Exclude cross-family conflicts:** no Gelbsenf if a Kreuzblütler (cabbage, Radieschen) is coming next or grew there recently.
- Green manure is a normal planting → it counts for rotation and the bed history.
- *(P4)* Shown on the bed page as "Gründüngung möglich" per free space (one button per fitting green manure, Phacelia first). Only outdoor beds and non-history seasons. The green manure ends the day before the next crop. Code: `greenManureSuggestions` in `src/lib/rules/succession.ts`.

### 4.6 Succession growing
A series creates n plantings with `firstDate + i × intervalDays`. Moving or deleting one asks: "nur diesen Satz / alle folgenden".
*(P4)* Each set stays in the first row if it is free again, otherwise it moves to the next free space across the bed; the form shows the sets before saving. Nothing is saved if one set does not fit. "alle folgenden" moves the later sets by the same number of days and takes over crop, route, width and quantity; each set keeps its row. Table `succession_series` (bed, species, interval, count), `plantings.succession_series_id`.

### 4.7 Shopping list (no stock)
Generated per season from all PLANNED plantings, grouped by `kind`:
- SEED: species/variety + metres of row or number of plants (e.g. "Möhre – 2 Reihen à 2,0 m")
- SEEDLING: number of plants
- SETS: seed potatoes in kg (`count × setWeightG`), onion sets as a number
- GREEN_MANURE: m² of bed
Entries can be ticked "gekauft"; regenerating keeps manual entries and ticks.

### 4.8 Suggestion engine (Phase 5)
Input: wishlist (species, count or number of rows). Fill the highest-value spots first (score = rotation + neighbours + sun + tall plants on the north side), then improve by swapping (local search). Output = suggested plantings with status PLANNED, which you confirm.

---

## 5. Starting plant data (sourced, v2)

### 5.0 Sources
| Key | Source | Used for |
|---|---|---|
| **[BZfE]** | Bundeszentrum für Ernährung / BLE: *Tabelle Aussaat- und Pflanzzeiten* (bzfe.de) | **Primary source**: spacing, pre-culture, planting, direct sowing, harvest |
| **[BUND]** | BUND: *Mischkultur – gute und schlechte Nachbarn* (bund.net) | **Primary source**: neighbours |
| [LWG] | Bayerische Gartenakademie (LWG Veitshöchheim): plant/row spacing table | Cross-check spacing |
| [Sec] | Plantura, Ökotest, Utopia, toom/Hornbach guides, Eigenheimerverband, BayWa product sheet | Where BZfE has no value: greenhouse dates, chilli, pre-sprouting, green manure, cucumber pre-culture |

Rule: **BZfE/BUND first**; secondary sources only fill gaps or are cited where they clearly disagree (marked ⚠). Each seed data record gets a field `sourceRef` (e.g. `"BZfE"`, `"Sec:Plantura"`), so it's clear where each value comes from. BZfE gives calendar dates (Central Germany); the tool converts them into offsets from the frost dates (LF = 15.05), so changing the frost date moves them.

Abbreviations: A./M./E. = beginning/middle/end of the month. Spacing = between rows × in the row (cm).

### 5.1 Crops
| Art | Latein | Familie | Bedarf | Abstand | Vorkultur | Pflanzung / Aussaat | Ernte | Quelle |
|---|---|---|---|---|---|---|---|---|
| Tomate | *Solanum lycopersicum* | Nachtschatten | Stark | **60×60** (LWG: 80×50) | Fensterbank **M. Mär–M. Apr**; keimt bei 20–22 °C | Freiland **M. Mai–A. Jun**; Gewächshaus **ab E. Apr** | **Aug–Okt** (GH until E. Okt) | BZfE; GH: Sec (Plantura, Eigenheimerverband) |
| Gurke | *Cucumis sativus* | Kürbisgewächse | Stark | **150×40** (GH upright: ≥ 30 in the row) | Fensterbank **A. Apr**, 3–4 W, keimt bei 20–24 °C | Direct sowing outdoors **from M. Mai**; plant out from M. Mai; GH unheated ⚠ E. Apr (toom) vs. M. Mai (Utopia) → **default A. Mai** | **A. Jun–E. Sep** | BZfE; Vorkultur/GH: Sec |
| Kopfsalat / Pflücksalat | *Lactuca sativa* | Korbblütler | Schwach | **30×25** | Fensterbank/Anzucht **Mär–Jul** | Plant **A. Apr–M. Aug** · direct sowing **E. Mär–E. Jul**; batch every 3 W | **1,5–2 months** after sowing/planting | BZfE |
| Radieschen | *Raphanus sativus* var. *sativus* | Kreuzblütler | Schwach | **10×5** (LWG 15×4) | – | Direct sowing **M. Feb–M. Aug** (Feb only under cover); batch every 2–3 W | **E. Apr–E. Sep** | BZfE |
| Zwiebel (Steckzwiebel) | *Allium cepa* | Lauchgewächse | Schwach | **25×10** | – | Onion sets **Mär–Apr** | **from A. Jul** (when the leaves fall over) | BZfE |
| Zwiebel (Saat) | *Allium cepa* | Lauchgewächse | Schwach | **25×8** | – | Direct sowing **A. Mär–A. Apr** | **M. Aug–E. Sep** | BZfE |
| Möhre früh | *Daucus carota* subsp. *sativus* | Doldenblütler | Mittel | **25×4** | – | Direct sowing **A. Mär–M. Jul** | **3–3,5 months** after sowing | BZfE |
| Möhre spät / Lager | " | " | Mittel | **25×7** | – | Direct sowing **A. Mai–A. Jul** | **4 months** after sowing | BZfE |
| Kartoffel früh | *Solanum tuberosum* | Nachtschatten | Stark | **60×30** | **Pre-sprouting ~6 W before planting**, bright, 10–15 °C | Plant **M. Apr–E. Mai** (soil ≥ 7–9 °C) → earth up at 10–15 cm height | **from E. Jun** | BZfE; pre-sprouting: Sec (Ökotest, toom) |
| Kartoffel Lager | " | " | Stark | **60×30** | as above | **M. Apr–E. Mai** | **M. Aug–E. Sep** | BZfE |
| Erdbeere | *Fragaria × ananassa* | Rosengewächse | Mittel | **90×30** | – | Plant **Jul/Aug**, stays 3–4 years | **Jun/Jul** (everbearing varieties until autumn) | BZfE |
| Himbeere (Herbst) | *Rubus idaeus* | Rosengewächse | Mittel | **200×40** | – | Plant **Mai/Jun or Okt/Nov**; permanent crop, cut back to ground in late winter | **Aug–A. Nov** | BZfE |
| Paprika | *Capsicum annuum* | Nachtschatten | Stark | **40×40** (LWG 60×40) | ⚠ BZfE **M. Mär–M. Apr**; Sec **Feb** (10–12 W, 25–28 °C) → **default A.–M. Mär** | Freiland **M. Mai–A. Jun**; GH **from E. Apr** | ⚠ BZfE E. Jul–A. Aug; Sec until Okt → **default E. Jul–Sep** | BZfE + Sec |
| Chili | *Capsicum* spp. | Nachtschatten | Stark | **40×40** (as Paprika) | Fensterbank **Jan–Feb**, 25–28 °C (>100 days to harvest) | GH **from M. Apr**; Freiland **from M. Mai** | **Aug–Okt** | Sec (Plantura, Utopia) – not in BZfE |

### 5.2 Green manure
| Art | Latein | Familie | Aussaat | Notes | Quelle |
|---|---|---|---|---|---|
| Phacelia | *Phacelia tanacetifolia* | Raublattgewächse | **A. Apr–E. Mai** and **A. Aug–E. Sep**; ~5 g/m² | **Not related to any vegetable family → fits into any rotation**; freezes in winter, leave the remains on the bed | Sec (BayWa product sheet, Kiepenkerl) |
| Gelbsenf | *Sinapis alba* | Kreuzblütler | **Aug–A. Okt** (grows fast, 4–5 W) | **Not if a Kreuzblütler (Radieschen, cabbage) grew in the bed in the last 3 years** (clubroot); freezes in winter | Sec (selbst.de, gartenjournal) |

### 5.3 Rotation pauses per family (`Family.rotationPauseYears`)
Nachtschatten 3 · **Kürbisgewächse 4** (Plantura) · **Kreuzblütler 4** (incl. Gelbsenf) · Rosengewächse 4 · all others 3.

### 5.4 Neighbours (BUND, limited to our plants)
| | gut | schlecht |
|---|---|---|
| Tomate | Möhre, Kopfsalat, Pflücksalat, Radieschen, Paprika¹ | Kartoffel, Gurke¹ |
| Gurke | Zwiebel, Kopfsalat, Paprika | Radieschen, Tomate¹ |
| Kopfsalat | Zwiebel, Tomate, Radieschen, Gurke, Erdbeere | – (only Petersilie) |
| Radieschen | Tomate, Salat, Möhre, Erdbeere | Gurke |
| Zwiebel | Gurke, Kopfsalat, Möhre, Erdbeere | – (Bohnen, Kohl not among our plants) |
| Möhre | Zwiebel, Tomate, Radieschen, Paprika | – |
| Kartoffel | – | Tomate |
| Erdbeere | Radieschen, Kopfsalat, Zwiebel, Paprika | Kartoffel, Tomate, Himbeere |
| Himbeere | – | Erdbeere |
| Paprika (+ Chili²) | Möhre, Zwiebel, Gurke, Erdbeere, Tomate¹ | – (only Fenchel) |

¹ not in BUND; from secondary sources (Hornbach, sanier.de); several sources agree. ² Chili is not listed separately; it gets the Paprika values (same genus).
**Changes from v1:** Kartoffel–Gurke and Kartoffel–Himbeere removed (no source found); Erdbeere–Kartoffel/Tomate/Himbeere and Paprika–Gurke/Möhre/Erdbeere added.

### 5.5 Toxicity & storage
> **P1:** checked against sources (BfR, BZfE via Öko-Test, Verbraucherzentrale NRW, BMLUK, TFA-Wissen) and corrected in `src/lib/data/plants.ts` – that file is now the reference. The table below is the original v1 draft. Unsupported claims were removed (e.g. "Paprika: grüne Teile leicht giftig", fixed storage temperatures); texts without a specific source are marked `Praxis`.

| Art | Giftig | Lagerung |
|---|---|---|
| Tomate | Grüne Teile, unreife Früchte (Solanin/Tomatin) | 12–16 °C, nicht in den Kühlschrank, grüne nachreifen lassen |
| Gurke | – | 10–13 °C, getrennt von Tomaten/Äpfeln (Ethylen) |
| Salat | – | feucht im Kühlschrank, 3–5 Tage |
| Radieschen | – | Blätter ab, Kühlschrank ~1 Woche |
| Zwiebel | Giftig für Hunde/Katzen | 2–3 W trocknen, dann dunkel, kühl, trocken |
| Möhre | – | Grün ab, in feuchtem Sand kühl |
| Kartoffel | Grüne Teile, grüne Knollen, Beeren (Solanin) | dunkel, 4–8 °C, frostfrei (Sec: Leinetal24/Utopia) |
| Erdbeere / Himbeere | – | kaum lagerbar, 1–2 Tage kühl, einfrieren |
| Paprika / Chili | grüne Teile leicht giftig; Chili: Capsaicin – Handschuhe | Paprika 8–10 °C ~1 W; Chili trocknen/einfrieren |

### 5.6 Status after P1
- ✅ Toxicity and storage texts checked against sources
- ✅ Germination temperatures (Tomate, Gurke, Paprika, Chili) and minimum soil temperatures (Gurke 14 °C, Kartoffel 7 °C) filled in
- Open: other environment fields from §8.2 (minimum temperature, soil moisture, light) → P7
- Open: heights/widths for the plant card (no reliable source per species yet; heights depend strongly on the variety)
- Open: `setWeightG` for seed potatoes (needed for the shopping list in P5)

> **Greenhouse:** the order Tomate | Paprika | Chili | Gurke has only good neighbours next to each other. Tomate and Gurke must not be in neighbouring rows.

---

## 6. Screens (see wireframes)

| # | Screen | Device | Contents |
|---|---|---|---|
| 1 | **Übersicht** | Desktop | KW tasks by location, ready to harvest, frost warning, season status |
| 1m | **Gartenmodus** | Phone | This week's tasks as a checklist, "Ernte eintragen", "Notiz/Foto" |
| 2 | **Gartenplan** | Desktop (phone: view only) | 2D map, season selector + date slider, rows coloured by crop; click a bed → bed detail with history |
| 3 | **Saisonplanung** | Desktop | Wishlist (left) · bed map with drag & drop (middle) · warnings/suggestions (right) · tab "Einkaufsliste" |
| 4 | **Kalender** | Desktop + phone | KW view (default) / month, filter by location/bed/task type |
| 5 | **Pflanzen** | Both | Library as a grid of cards, search, filter by family/feeding type; card detail |
| 6 | **Tagebuch** | Both | Harvests, notes, problems, soil tests; filter by bed/crop; yield per season |

### Plant card (one side, top → bottom)
1. Picture (credit line + licence) 2. Deutscher Name · *lateinischer Name* · Familie · ein-/mehrjährig 3. Key figures: Höhe, Breite, Abstand, Nährstoffbedarf 4. Toxicity bar (only when relevant) 5. **12-month timeline**: Fensterbank (blue), Gewächshaus (violet), Direktsaat (green), Auspflanzen (orange), Ernte (red) 6. Gute/schlechte Nachbarn (chips) 7. Düngung 8. Lagerung 9. "In deinem Garten 2027: Beet B, Reihe 2".

---

## 7. Phases (unchanged)
P0 spec + wireframes → P1 plant database + cards → P2 beds/rows/seasons/history → P3 tasks + calendar → P4 rotation/neighbours/succession/green manure → P5 suggestions + shopping list → P6 PWA/offline, login, hosting → **P7 weather + sensors** (weather can come earlier, right after P3, since it needs no hardware).

---

## 8. Environment data (planned now, built in P7)

The old prototype was removed on 03.11.2026; we start clean. Weather and sensors are **planned into the model now** so nothing has to be rebuilt later.

### 8.1 Architecture
```
Open-Meteo API ──(scheduler, every 3 h)──┐
FYTA cloud API ──(poll every 30 min)─────►├─ app (SvelteKit) ─ Postgres
                                          │   ├─ ingest  /api/ingest/readings
                                          │   ├─ jobs    weather · aggregation · alerts · task regeneration
                                          │   └─ rules   + environment rules
```
- **Weather:** Open-Meteo (free, no API key, forecast + history, uses DWD models). Stores the forecast for 7 days and daily values.
- **Sensors:** FYTA sensors → FYTA cloud → polled by the app (§8.2). A direct HTTPS ingest stays possible for other sensors.
- **DB:** **Postgres** (instead of SQLite): handles the time series, and runs as a managed service or as a container when hosted online. Plain tables + indexes are enough for this amount of data; TimescaleDB is optional.
- **Jobs** run in the app (node-cron); no separate service needed.

### 8.2 Additional entities
**Hardware: FYTA (decided 04.11.2026)**
| Device | Where | Measures | Connection |
|---|---|---|---|
| **FYTA Terra** | one per bed (Beet 1, Beet 2, fence beds) | soil moisture (VWC), salinity/nutrients (EC), light (PPFD/DLI), soil + ambient temperature | Wi-Fi directly, solar + rechargeable battery, built for vegetable beds |
| **FYTA Beam G2** | greenhouse / pots | as Terra | Bluetooth → FYTA Wi-Fi Hub; not fully waterproof → only in the greenhouse, not in open beds |
| **FYTA Sphere** (optional) | greenhouse | light, temperature, air humidity | Bluetooth → Hub |

Consequences for the app:
- **No direct ingest:** FYTA sensors send to the FYTA cloud only (the raw data is processed there). The app **polls the FYTA API** (`POST /api/auth/login` with the FYTA account → bearer token; `GET /api/user-plant`, `/api/user-plant/{id}`, measurements per plant) – the same API the Home Assistant integration uses.
- **Mapping:** each sensor is a "plant" in the FYTA app → in the Gardenplaner it is linked to one bed (`SensorDevice.fytaPlantId`).
- **Values available:** moisture %, salinity/EC (mS/cm), temperature, light as PAR/DLI (not lux), battery %, FYTA status per value (too low … too high). **No N/P/K** – nutrients only as EC. **Air humidity only with the Sphere.**
- **Network:** the FYTA Hub and the Terra only support **2.4 GHz Wi-Fi** → the 5G router must offer a 2.4 GHz network.
- **Risk:** the FYTA API is published by FYTA but not a versioned contract; if it changes, only the polling adapter has to be adapted. The FYTA login is stored as a secret (env), never in the DB in plain text.

| Entity | Fields |
|---|---|
| **SensorDevice** | `nameDe`, `bedId` (one device per bed), `provider FYTA \| HTTP`, `fytaPlantId?`, `model` (Terra/Beam/Sphere), `batteryPct`, `lastSeenAt`, `active` |
| **Reading** | `deviceId`, `kind`, `ts`, `value` – raw values, kept **90 days** |
| **ReadingHourly** | `deviceId`, `kind`, `hour`, `min`, `max`, `avg` – kept permanently |
| **WeatherForecast** | `fetchedAt`, `ts`, `tempC`, `precipMm`, `sunshineMin`, `windKmh`, `soilTempC?` |
| **WeatherDaily** | `date`, `tMinC`, `tMaxC`, `precipMm`, `sunshineH`, `source FORECAST \| OBSERVED` |
| **EnvRule** | `type FROST \| GH_HEAT \| DRY_SOIL \| LOW_LIGHT \| LOW_NUTRIENTS \| LOW_BATTERY \| SENSOR_OFFLINE`, `scope (garden/bed)`, `threshold`, `active` |
| **Alert** | `envRuleId`, `bedId?`, `triggeredAt`, `messageDe`, `resolvedAt?`, `taskId?` |

`kind` = `SOIL_MOISTURE` (%) · `EC` (mS/cm) · `SOIL_TEMP` / `AIR_TEMP` (°C) · `LIGHT_PAR` (µmol/m²·h) · `DLI` (mol/m²·d) · `AIR_HUMIDITY` (%, Sphere) · `BATTERY` (%). New kinds can be added without a schema change.

Polling job: every 30 min `GET /api/user-plant` → for each linked plant read the latest values and battery, store them as Readings (deduplicated by timestamp). FYTA sensors measure about 4× per hour; the Hub uploads roughly hourly.

A generic `POST /api/ingest` (token per device) stays possible as a second provider (`HTTP`) for other sensors later.

**New species fields (filled in P1 if known):** `minTempC` (frost/cold tolerance), `minSoilTempSowC` (soil temperature needed for germination), `soilMoisture LOW|MEDIUM|HIGH`, `light FULL|PARTIAL|SHADE`, `ghMaxTempC`.

### 8.3 What the data is used for
- **Frost warning:** forecasted minimum < 2 °C in the next 48 h and plantings with `minTempC` above that are in the bed → alert + task "Vlies auflegen / Gewächshaus schließen".
- **Greenhouse heat:** greenhouse air temperature > `ghMaxTempC` → "Lüften".
- **Watering note:** soil moisture below the range for the crop, or < 5 mm rain in 7 days → task "Gießen" for the affected bed.
- **Sowing time:** direct sowing is only suggested when the soil temperature (sensor or Open-Meteo) has stayed ≥ `minSoilTempSowC` for 3 days → the task window can move earlier or later ("Möhren säen: Boden jetzt warm genug").
- **Light:** sum of light hours per bed → check "sun / partial shade" against reality.
- **Logbook/statistics:** weather and sensor values linked to harvest amounts per season.
- **Nutrients:** EC (salinity) trend falls clearly over several weeks during the main season → note "Düngen prüfen" for the bed (complements the fertilizing interval from §4.4).
- **Battery:** below 20 % → note "Akku laden/tauschen" for the device.
- **Sensor offline:** no value for > 6 h → note on the dashboard.

### 8.4 Screens
- Overview: weather strip (7 days) + current sensor values per location, active alerts.
- Bed detail: sensor curves (24 h / 7 days / season).
- Settings: manage sensors (create, show token, assign to a bed), alert thresholds.

---

## 9. Open points
1. ~~Sensors / network~~ → FYTA Terra per bed, Beam G2 (+ optional Sphere) in the greenhouse, 5G router with 2.4 GHz Wi-Fi (§8.2)
2. ~~Power and network~~ → decided
3. ~~Check timing values / neighbours~~ → done in v3 with sources (§5)
4. ~~Bed list~~ → 2 beds 4 × 4 m, greenhouse, strawberry bed and raspberry bed (3 m) at the fence; exact sizes/positions of greenhouse and fence beds still to be entered in the app
