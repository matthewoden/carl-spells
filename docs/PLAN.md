# Carl — Implementation Plan

## Overview and constraints

Carl is a mobile-first web app for the “add, change, or remove a letter” spell-name game: pick a spell from D&D (SRD 5.2.1) or Pathfinder 2E (Player Core 1 & 2), make one edit, share the result. It runs entirely on Cloudflare’s free tier with real URLs for every screen and every shared joke.

Hard constraints:

- Free tier only: one Worker (100k requests/day, 10 ms CPU), static assets (free, unlimited), KV, R2. No Workers Paid, no D1 needed.
- Real path routing: `/spell/fireball`, `/s/<share-id>`, never `#/`. Share pages must render OG tags server-side so Reddit, Discord and iMessage crawlers see the card.
- Mobile-first: letter-level editing by tap, native share sheet, a “show my screen” mode.
- Content from SRD 5.2.1 (CC-BY-4.0) and Pathfinder Player Core 1 & 2 (ORC License) only; attribution on every page. Domain is carl-spells.com; the product name stays CARL.
- No accounts, no user-generated text beyond one letter edit of a known name, so nothing to moderate.

## Architecture on Cloudflare

One Worker with static assets bound to it, deployed from a single Vite project. There is no database: every shared joke is fully described by its URL, so nothing needs to be stored to be shareable.

&#91;embedded content: Carl architecture · one Worker, three route groups, no database\]

The Worker only runs for share pages and image renders; every app load and every asset is a free static request. Choose Workers with the `[assets]` binding rather than Pages: Pages Functions bill the same but Workers is where Cloudflare is investing, and one `wrangler.toml` covers everything.

Project layout:

- `src/` React app (Vite, TypeScript, React Router in browser mode)
- `worker/` the Worker: router, share-page HTML template, OG renderer
- `data/` build script that pulls SRD 5.2.1 spells into `spells.json` plus a compact `names.json` the Worker imports
- `wrangler.toml` with `[assets] directory = "dist"`, `not_found_handling = "single-page-application"`, and `run_worker_first = ["/s/*", "/og/*"]`

## Routing and URLs

Every screen has a real path; the only server-rendered routes are the share page and its image.

| Path | Served by | What it is |
| --- | --- | --- |
| `/` | Static `index.html` | Spell search, the home screen |
| `/spell/:slug` | Static `index.html` (SPA fallback) | Editor for one spell, e.g. `/spell/fireball` |
| `/s/:spell/:name` | Worker, SSR | Share page: OG tags + the card, with Cast your own / Remix this one |
| `/og/:spell/:name.png` | Worker, cached | 600×315 preview image |
| `/screen/:spell/:name` | Static `index.html` | Full-width “show my screen” view |
| `/spells` | Static `index.html` | Every spell in one game, grouped by letter or level/rank, sortable; `?g=`, `?by=level`, `?sort=desc` |
| `/about` | Static `index.html` | Rules, attribution, source link |

Two games, one set of URLs: paths carry only the spell slug. 338 slugs belong to one game; 70 (Fireball, Bless…) exist in both, and for those the game only changes the spell line (“Level 3 · Evocation” vs “Rank 3 · Arcane, Primal”), so links to them add `?g=pf2e` when they come from Pathfinder (D&D is the default). The build fails if a shared slug ever maps to two different names. The player's game is a device preference set by the home-screen toggle; it scopes search, Surprise me and Another, and opening someone else's link doesn't change it.

Because any edit is allowed, the share URL carries the new name as text rather than a packed edit: `/s/<spell-slug>/<new-name-slug>`, e.g. `/s/fireball/fireballs` or `/s/protection-from-evil-and-good/protection-from-evil-and-food`. The spell slug identifies the original (so the card can show the strikethrough and the level/school line) and the second segment is the joke, lowercase with hyphens for spaces, apostrophes dropped. Readable aloud at the table, and no database. The Worker accepts the second segment only if it is 1–40 characters of `[a-z0-9'-]`, so the image route can’t be turned into a free text renderer; title-case is restored from word boundaries when rendering.

SSR detail for `/s/:code`: the Worker returns the built `index.html` with the `<head>` rewritten via `HTMLRewriter` (title, description, `og:image`, `twitter:card=summary_large_image`, canonical). That keeps one HTML shell for the whole app and avoids a second template. Body gets a `<noscript>`-friendly static rendering of the card so Reddit’s text preview and screen readers see the joke too.

Client side, React Router in browser-history mode with these same routes. `not_found_handling = "single-page-application"` on the assets binding makes deep links to `/spell/fireball` work without the Worker running at all.

## Spell data and licensing

Use SRD 5.2.1 (the 2024 rules), released under CC-BY-4.0, as the single source; optionally merge SRD 5.1 names that 5.2 dropped, since both are CC-BY. Expect roughly 360 spells. Named spells (Bigby’s, Mordenkainen’s, Tasha’s, Melf’s, Otiluke’s and so on) are not in the SRD and must not appear.

Data pipeline, run at build time, never at runtime:

1. Pull spell names, level, school, and a one-line description from the SRD markdown repo (`downfallx/dnd-5e-srd-markdown` or the official PDF) into `data/spells.json`.
2. Emit `names.json`: an ordered array of names only, \~10 KB, imported by both the app and the Worker. Index order is part of the share code, so append new spells at the end and never reorder.
3. Names, level and school only; no descriptions. The card and the editor show the name, the edit, and the level/school line, nothing else.

Pathfinder 2E: ORC-licensed Remaster spells from Player Core and Player Core 2 only (408 spells), pulled at build time from the Foundry VTT pf2e system (`data/build-pf2e.mjs`, pinned commit), which records each spell's license and book. No legacy OGL content and no Lost Omens books, whose Golarion names are Paizo Reserved Material. The About page carries the ORC notice, the two books' attribution lines verbatim, and Reserved Material / Expressly Designated Licensed Material statements.

Attribution, required by the license, in the About page and the footer of every share page:

> This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License.

Trademark: CC-BY covers the text, not the marks. The domain carl-dnd.com uses “dnd” as shorthand and appears in the OG card footer; keep the “D&D” and “Dungeons & Dragons” marks out of the logo and OG images; “spells from the 5e SRD” in body copy is fine.

## Core game mechanics

The game is one letter, but the app never blocks an edit: the name is a big centered text field, and the app encourages one edit by naming what you did rather than enforcing anything.

Editor interaction, mobile first:

- The spell name is an `<input>` set in the display font at 58 px, centered, wrapping per word. A mirror layer behind it renders the same text with the changed letters in ember; the input’s own text is transparent so the caret sits on the styled glyphs.
- `autocorrect="off" autocapitalize="off" spellcheck="false"`, or iOS turns Fireballs back into Fireball.
- Live Damerau-Levenshtein diff against the original drives one line under the field: “One letter added”, “One letter changed”, “One letter removed”. At distance 2+ it says “Two letters changed”, “Three edits”, in the same calm voice; at 0 it says nothing. No warnings, no red.
- The diff also drives the highlight: letters that differ from the original are ember, so a one-letter joke has one ember letter and a rewrite is mostly ember, which is its own quiet nudge.
- Reset link restores the original. Share and Show-my-screen work at any distance.

The share card carries the same line (“one letter added”), so the table’s norm travels with the joke without the app ever refusing a larger edit.

Search: client-side, Fuse.js over `names.json`, prefix matches ranked above fuzzy ones, results limited to 8. The list is small enough that no index needs to be built ahead of time.

## Sharing and preview images

Share = copy a `/s/:code` link; the image comes from the Worker on first crawl and is cached from then on.

The share button calls `navigator.share({title, text, url})` where supported, otherwise copies the link and shows a toast. The `text` is the joke itself (“Fireball → Fireballs”) so it reads well even in apps that ignore previews.

OG image route `/og/:code.png`:

1. Check the Cache API for the URL; on hit, return it (no CPU billed).
2. Decode the code; 404 if invalid.
3. Render a 1200×630 card with `workers-og` (Satori + resvg-wasm): cream background, original name small and struck through, new name large with the edited letter in orange, the level/school line between fleuron rules, a small CARL wordmark. One serif font subset (Latin only, \~30 KB) embedded in the Worker bundle.
4. Store in KV with a 30-day TTL and put in the Cache API with `Cache-Control: public, max-age=31536000, immutable`; the content never changes for a given code.

CPU risk: the free plan allows 10 ms of CPU per request and a Satori render can take more. Mitigations, in order: measure first in `wrangler dev` and the dashboard; shrink the font to a strict subset; render at 1200×630 but with minimal layers; if still over, render the card as SVG (microseconds) and only rasterize via a browser-side `<canvas>` when the user taps share, uploading the PNG to KV through a `PUT /og/:code` endpoint that validates the code and a 200 KB size cap. The SVG path still produces a correct image for any link, so the client upload is an optimization, not a dependency.

Test previews with Reddit’s link submit page, Discord, iMessage, and Slack before launch; each has its own quirks (Discord wants `og:image` under 8 MB and resolves relative URLs badly, so always emit absolute URLs).

## Show my screen mode

`/screen/:code` shows only the new name, filling the width of the phone in landscape or portrait, for passing the phone around the table.

- Render the name as inline SVG: measure the text once in a hidden `<canvas>` (`measureText` with the display font), set `viewBox` to that width and height, and give the SVG `width: 100%`. Height then follows the aspect ratio with no JS on resize. Never use textLength or lengthAdjust to force the fit: stretching Cormorant’s glyphs reads as a different, wider face. Fit by font-size only, and let a name land a little short of the edges.
- Long names (“Protection from Evil and Good”) wrap to two lines by a greedy word break before measuring, so the longest line sets the width.
- The edited letter keeps its orange highlight; the original name appears small underneath, tappable to toggle off for a “guess the spell” variant.
- Request a screen wake lock (`navigator.wakeLock.request('screen')`) on entry and release on exit; try `screen.orientation.lock('landscape')` and ignore the rejection on iOS Safari, where it isn’t available.
- Hide all chrome; one small Back button that fades after 2 seconds and returns on tap.

## Stress test: extremes and safe areas

Measured against the actual SRD 5.2.1 list (339 spells): the shortest names are three letters (Aid, Fly, Hex, Web); the longest is Protection from Evil and Good, 25 letters in five words, 29 characters with spaces. The longest single word is Prestidigitation at 16 letters, then Invulnerability (15) and Teleportation (13), which matters more than the longest name for any letter-by-letter editor. Only 14 names exceed 20 characters; the median is 12. Seven names carry punctuation: Antipathy/Sympathy, Blindness/Deafness, Enlarge/Reduce, Arcanist’s Magic Aura, Dragon’s Breath, Heroes’ Feast, Hunter’s Mark.

| Case | Where it bites | Decision |
| --- | --- | --- |
| 3-letter name, Remove | Editor, result is 2 letters (“We”, “Fl”) | Allowed, like every edit. The status line reads “One letter removed”; a two-letter name at 58 px still looks fine centered. |
| 16-letter word (“Prestidigitation”) | Editor tile row at 390 px | This is why the editor is a text field, not letter tiles: 16 tiles in 342 px would be 18 px each. The field wraps per word; a 16-letter word at 58 px Cormorant is about 330 px, so it fits one line with the font shrunk a step to 52 px. |
| 28-character name | Big name on the editor and share page | Fit-to-width with word wrap: start at 58 px, shrink until the longest word fits, allow up to 3 lines. |
| 28-character name | OG card at 1200×630 | Satori can’t auto-fit. Measure line widths in the Worker with opentype.js against the same font subset, pick the largest size (≤ 168 px) where a balanced 1- or 2-line wrap fits 1,040 px wide and 300 px tall. |
| Apostrophe and slash | Editor, share code | Editable like anything else; the diff counts punctuation as characters. The slug drops apostrophes and turns slashes into hyphens, and the Worker resolves back to the SRD spelling via the spell slug. |
| Capitalization | Add/Change at a word start | The field keeps whatever the player types; the share card title-cases from the slug’s word boundaries, so “fireballs” and “Fireballs” share one URL and one image. |
| Share code size | URL length | Two slugs, each ≤ 40 characters: worst case about 90 characters of path, fine for every share sheet and for Reddit. |

Show-my-screen in landscape:

- Treat landscape as the primary orientation for this screen. On an iPhone with the Dynamic Island, landscape safe-area insets are about 59 px on each side and 21 px at the bottom, so a 852×393 viewport leaves roughly 734×372 px of safe canvas. Android cutouts report through the same `env(safe-area-inset-*)` values once `viewport-fit=cover` is set.
- Layout: `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)` on the root, plus a 16 px inner gutter, and the name SVG at `width: 100%` of what’s left. Nothing text-bearing goes in the inset zone; the cream background does extend under the island so it doesn’t look like a letterbox.
- Sizing rule: pick the line count (1–3) and greedy word-balanced wrap that gives the largest font size such that the longest line fits the safe width and all lines fit 80% of the safe height. “Web” ends up height-capped at \~260 px; “Protection from Evil and Good” ends up as two lines (“Protection from Evil” / “and Good”) at roughly 80 px. Both are readable across a table.
- Orientation lock: `screen.orientation.lock('landscape')` works on Android after entering fullscreen and never on iOS Safari. Fallback when the phone is held in portrait: rotate the content container 90° with CSS so the name uses the long axis; the player turns the phone and it reads correctly. Offer a small toggle for anyone who prefers portrait.
- Keep the wake lock and the fade-out Back button; put the Back button inside the safe area on the leading edge, not under the island.

## Scaling for a Reddit spike

A front-page post is survivable on the free tier because almost every request it generates is a static asset or a cache hit; the budget that can actually run out is 100,000 Worker invocations per day and the 1,000 requests/minute burst limit.

What a Reddit visit costs:

| Request | Counts against the Worker? | Notes |
| --- | --- | --- |
| Reddit crawling the posted link | Yes, once | Then cached by Reddit |
| Visitor opens `/s/:code` | Yes, if not cached at that PoP | Cache API is per data center; expect a few dozen misses per code, not thousands |
| Visitor loads JS/CSS/`spells.json` | No | Static assets are free and unlimited |
| Visitor plays and shares a new joke | Yes, 1–2 per new code | New share page + new image |
| Any `/spell/:slug` deep link | No | Served by the SPA fallback |

At 100,000 invocations a day you could absorb roughly 50,000 new jokes or share-page cache misses in a day, which is far beyond a popular post. The risk is burst: 1,000 requests/minute at the Worker. Defenses:

- Set `Cache-Control` on share HTML to `public, s-maxage=86400` so Cloudflare’s CDN cache serves repeats before the Worker is invoked at all. Combined with `run_worker_first` only on `/s/*` and `/og/*`, the Worker is a cold path.
- Keep the posted link itself pointing at a share page you pre-warmed from several regions (open it through a few VPN exits or a free global uptime checker) before posting.
- Add a Cloudflare rate-limiting rule (free plan includes one) on `/og/*` and the optional `PUT /og/*` upload: e.g. 20 requests/minute per IP, so a scraper or a bug can’t burn the daily budget.
- If Error 1027 (daily limit) ever appears, the app still works: static routes keep serving, only new share previews degrade to a text card. Decide ahead of time that $5/month for Workers Paid is the fallback and have the upgrade one click away.

Also think about the post itself: the link should be a specific joke, not the home page, so the card shows a punchline rather than a logo.

## Design direction

The look is Art Deco set in type: flat ground, hairline geometry, one serif family, and a single orchid accent reserved for the changed letter. Two themes share every component and differ only in tokens; the dark theme is the reference and the light theme mirrors it on cream. No textures, no gradients beyond the dark theme’s faint corner lift, no drop shadows.

| Token | Dark (reference) | Light | Used for |
| --- | --- | --- | --- |
| `--page` | `#120C18` plum-black, radial lift to `#241A2E` from top-right | `#F4ECDC` cream | Backgrounds |
| `--ink` | `#F2E3C4` cream-gold | `#2E1F14` deep brown | Body text, spell names, button text |
| `--ink-soft` | `#C9B48C` | `#6E543F` | Secondary text, the struck original name |
| `--line` | `#E6D3AC` pale gold | `#2E1F14` | Frame, corners, button geometry (all 1 px) |
| `--rule` | `#5A4A3A` | `#D5C3A5` | Quiet dividers, fleuron rules, input underline |
| `--accent` | `#B795DB` orchid | `#7A4FA3` deep orchid | The changed letter, the A in CARL, caret. Never buttons or links |
| `--hover` | `#241A2E` | `#EADFC8` | Button hover fill |
| `--link` | `#FFF3D6`, underlined | `#4A2F1C`, underlined | Text links, a step brighter (dark) or darker (light) than ink |

Type: Cormorant Garamond (500 for buttons, 600/700 for the spell name and headings), large and tightly leaded; Alegreya (400/500/italic) for body and UI text, which stays readable at 16 px on a phone. Both are open-licensed (SIL OFL) and self-hosted as subsetted woff2; the same Cormorant subset feeds the OG renderer so cards match the app. Small caps via `font-variant: small-caps` for labels like “Level 3 · Evocation”.

Buttons: one shape, the “hex” button, used for every primary and secondary action; there is no filled button. A 32 px bar with 1 px `--line` rules top and bottom, text in Cormorant Garamond 500 at 19 px, sentence case, no tracking, in `--ink`. Each end is a 28×32 SVG tip with three named parts: the open triangle (two lines from the rules to an apex at mid-height, flush with the bar), the open square (a 1 px diamond, point-to-point height 16, centered on the apex), and the filled square (a diamond of side 5.66 whose left point sits on the apex and whose right point meets the open square’s right vertex). The right tip is the same SVG mirrored. Hover: bar and both triangles fill with `--hover` over 200 ms; lines and squares unchanged. Give the bar 8 px vertical margin so the tap target is 48 px.

Text links are underlined with a muted underline color, in `--link`, and never styled as buttons. The letter tiles on the home screen keep hairline borders; the A tile uses `--accent` for border and letter.

Wordmark: CARL is an acronym (Change, Add, Remove Letters) and is always set in caps. Caps need air, not less: Cormorant Garamond 700 at 19–26 px with +0.16em tracking in headers and on the card, which reads smaller and quieter than the old 64 px title. On the home screen the mark is the game: four letter tiles, C A R L, drawn exactly like the editor’s tiles, with the A in orchid as the “added” letter and the four words in small caps beneath. That one element teaches the rule before the player reads a line of copy. Keep vertical whitespace around the mark tight (14 px to the tagline) so it sits as a header, not a hero.

Frame: the share page, the preview image and both show-my-screen views share one frame: a 1 px `--line` border with 16 px padding and a corner ornament at each corner, built from an 8 px bordered square straddling the corner plus two offset L extensions (32×15 and 15×32, offset 14 px and −1 px), so each corner reads as the border crossing a small square with an inner L beside it. All boxes are `border-box`; the geometry is in pixels and the 1200×630 card uses it at 2×. There is no inner hairline rectangle. In landscape the frame sits inside the safe-area padding. Fleuron rules (hairline · ❧ · hairline) remain the only ornament inside it.

Theme behavior: dark is the default for show-my-screen (a lit phone at a dim table); everywhere else follow `prefers-color-scheme` with a toggle in the About page that persists in localStorage. The OG image renders in the dark theme always, since it is seen on other people’s feeds where the plum card stands out and the orchid letter reads. Satori has no pseudo-elements, so the card renders the corners and the button tips from the same SVG paths the app uses, not from CSS.

Screens (mockups follow in the design canvas): Home / search, Spell editor, Share card, Show-my-screen, About.

## Milestones

Build in five phases, each ending with something you can hold up at the table; sharing (phase 3) is the one with real technical risk, so it comes right after the game is playable rather than last.

&#91;embedded content: Build order · 5 phases with a try-it-on-a-phone gate each\]

Phases 1 and 2 are a weekend; phase 3 is where the CPU budget gets measured and may send you to the SVG fallback. Nothing in 4 or 5 depends on a decision not already made above.

Open questions to settle before phase 1:

- [x] Final name and domain: CARL at carl-spells.com
- [x] Second game: Pathfinder 2E, Player Core 1 & 2 (ORC)
- [ ] Include SRD 5.1-only spell names alongside 5.2.1, or 5.2.1 alone?
- [x] The share card keeps the original name (struck through); hiding it is a show-my-screen toggle only
