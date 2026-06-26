# NMQ Campaign Builder — saved state (2026-06-26) — PAUSED here, picking up later

## Where things stand
Live at `https://nmq-campaign-builder.vercel.app`, code at `github.com/MarcoNMQ/nmq-campaign-builder`. Last pushed commit: `db53e18`. Everything described below is pushed and (should be) deployed — check Vercel dashboard for "Ready" status to confirm, since I (the assistant) can't see deployment status directly (my Vercel integration is tied to a different account than the one hosting this project — "NMQ Personal").

Work explicitly paused here (2026-06-26) to switch focus to the Media Plan Generator. One late addition after the Search/Keywords/Sitelinks work: Facebook briefing import now splits multi-link Asset Link cells into one ad per link (same ad set), storing each link in the ad's "URL tags" field — deliberately no AI involved, kept simple per Marco's explicit request (an earlier attempt added a dedicated reference field + AI copy generation + a new API route; all of that was built, verified working, then fully reverted/removed when Marco said to simplify — don't reintroduce that complexity unless asked again).

## What this app is
Web rebuild of the original Shimano-specific Streamlit campaign builder, generalized so any campaign manager can use it for any client, with Shimano's exact naming convention/taxonomy still available as a selectable option. Builds Google Ads (Demand Gen + Search) and Facebook/Instagram bulk-upload files. No database, no login — Zustand store persisted to `localStorage` (survives reload, doesn't sync across devices).

## Stack
Next.js 16 (App Router) + TypeScript + Tailwind v4, Zustand (+ `persist` middleware), exceljs (Facebook Excel), `@anthropic-ai/sdk` (Claude Haiku for ad copy), Vercel + Vercel Speed Insights.

## Everything built this session, roughly in order
1. **Briefing import** (Google Sheets/Excel/CSV) with search, select-all, manual column-mapping fallback for non-Shimano sheet layouts (`src/lib/briefing.ts`, `briefingMap.ts`, `BriefingImportPanel.tsx`, `/api/briefing/*` routes)
2. **Tooltips + floating guide panel** (`GuidePanel.tsx`, `guideContent.ts`) — contextual help per screen
3. **Free-text product fields by default** + **client-profile selector** (`CLIENT_TAXONOMIES` in `constants.ts`) — picking "Shimano" swaps Product category/family/promoted to Shimano's real taxonomy dropdowns; blank = free text for any client
4. **Naming engine refactor** (`src/lib/naming/` — `types.ts`, `generateName.ts`, `shimano.ts`, `generic.ts`, `templates.ts`, `validation.ts`, `dedupe.ts`, `dedupeValidation.ts`). Shimano's naming convention is "locked" and verified byte-for-byte identical to pre-refactor output via fixture tests. UI shows a static "Using: <convention>" caption, no dropdown (deliberately — only one generic template exists).
5. **Duplicate name collision resolution** at export time (`resolveDuplicateNames()` in `naming/dedupe.ts`) — appends `_02`, `_03` (never `#`) when distinct campaigns/ad groups generate the same base name. Two independent dedup layers: campaign-name collisions and ad-group-name collisions (the latter scoped to entities that shared the same *base* campaign name, fires independently of whatever suffix the campaign name itself got — see code comments in `dedupe.ts` for the reasoning, this was a genuinely ambiguous spec resolved via judgment call).
6. **Default CTA export bug fix** — `ad.cta ?? c.cta ?? ''` never fell through because empty string isn't nullish. Fixed to `ad.cta?.trim() || c.cta?.trim() || CTAS[0]`.
7. **AI copy generation reliability fix** (`/api/generate-copy/route.ts`) — was blindly `.slice()`-truncating over-limit AI output mid-word. Now: explicit hard-limit prompting, a self-correction retry loop (feeds violations back to Claude, up to 2 retries), and a word-boundary trim as the actual last resort.
8. **Mobile sidebar drawer** — was a fixed 320px panel eating most of a phone screen; now a togglable overlay drawer below `md` breakpoint (hamburger to open, X/backdrop-tap to close, auto-closes on selection).
9. **Headlines expanded 5→15** (matching Google's real RSA headline limit), vertical full-width copy fields with auto-grow textareas (no more mid-sentence clipping) and a 📋 copy-to-clipboard button on every field.
10. **Location targeting defaults to "Campaign level"** (was "Ad group level") in both manual creation and briefing import.
11. **localStorage persistence** (`zustand/middleware persist`) — campaigns/ads/platform/selection survive a page reload. "Clear all data" button added to sidebar (with confirm).
12. **Search ad support** — Channel = Search now shows genuinely different ad fields: no Video ID, Path 1/Path 2 added, Long Headlines hidden (not a Search concept), Descriptions capped at 4 (real RSA limit). CSV export writes `Ad type = "Responsive search ad"`, leaves Demand-Gen-only columns blank. Validation requires ≥3 headlines/≥2 descriptions instead of the Long Headline requirement.
13. **Keywords + Sitelinks** (Search-only) — new types `GoogleKeyword`/`GoogleSitelink` on `GoogleCampaign`. Keywords: text + Broad/Phrase/Exact match type. Sitelinks: link text, two description lines, final URL (campaign-level, blank Ad group column). Both export as **separate CSVs** (`/api/export?exportType=keywords|sitelinks`) — matches how Google Ads Editor actually imports them (different bulk-upload screens than the main campaign/ad CSV).

14. **Facebook multi-link briefing import** — a briefing row's Asset Link cell can hold several links (one per line, e.g. 6 Instagram posts), each meant to become a separate ad under the same ad set ("ad diversification" per Shimano's own sheet comments). `splitAssetLinks()` in `briefing.ts` splits on newline/comma, keeps URL-like tokens; one `FbAd` created per link, link stored in that ad's `url_tags` field (already-exported, no new field added). Kept deliberately simple — no AI copy generation, no dedicated reference field/banner.

All Google Ads Editor CSV column names used throughout (Demand Gen, Search/RSA, Keywords, Sitelinks) were verified against Google's own Editor documentation via web search during this session — not guessed.

## Known gaps / things flagged but not built
- **No Facebook equivalent** of Search/Keywords/Sitelinks work — Facebook tab untouched this whole session.
- **Negative keywords** not built (only positive Broad/Phrase/Exact) — wasn't asked for.
- **No keyword-level bid (Max CPC) field** — Editor supports it optionally, we don't expose it yet.
- **The dedup ad-group-collision design decision** (point 5 above) was a judgment call on ambiguous spec — flagged to Marco for sign-off, no explicit confirmation received yet that the chosen behavior (both campaign AND ad-group suffix firing independently on a true duplicate) matches his mental model. Worth revisiting if dashboards downstream behave unexpectedly.
- **"Campaign level" location targeting** (point 10) is still technically unverified against a real Google Ads Editor import — flagged since the very first naming-convention conversation, never actually test-imported.

## Process notes for next session
- Git pushes from this machine take a long time (often 5-10 min) due to a slow `git-credential-manager` lookup — always run `git push` in the background (`run_in_background: true`), don't block on it.
- There was a credential mixup earlier (cached token actually belonged to KaomboDJ, not MarcoNMQ) — resolved by erasing the stale credential (`git credential reject`) and confirming the new one via `curl api.github.com/user`. If a push ever 403s mentioning KaomboDJ again, that's the same class of issue — same fix.
- Dev server testing in this session used real Playwright (via `npx tsx`/headless chromium, installed ad hoc) for actual visual verification, not just type-checking — screenshots were taken and inspected for every UI change before considering it done. Worth doing the same going forward rather than trusting code alone.
- `node` is portable-installed at `C:\Users\marco.barata\nodejs\node-v22.14.0-win-x64`, added to user PATH — should be available in fresh terminals without re-doing the PATH export dance, but the Bash tool's persistent shell sometimes needs `export PATH="$PATH:/c/Users/marco.barata/nodejs/node-v22.14.0-win-x64"` prepended to commands anyway.
