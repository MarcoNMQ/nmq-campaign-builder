// Ported 1:1 from shimano_campaign_builder/app.py — briefing import helpers
// (Google Sheets / Excel / CSV briefing parsing, shared by Google and Facebook import flows)

import { COUNTRY_GROUP_PRESETS, COUNTRY_OPTIONS, MARKET_TO_GROUP } from './constants';

export interface BriefingRow {
  campaign_name: string;
  adset_name: string;
  creative_name: string;
  goal_code: string;
  perf_code: string;
  category: string;
  subcategory: string;
  product: string;
  key_product: string;
  market_code: string;
  country_code: string;
  creative_code: string;
  month: string;
  budget: string;
  final_url: string;
  asset_link: string;
  start_date: string;
  end_date: string;
  shimano_comments: string;
  channel_code: string;
}

/** Minimal RFC4180 CSV parser — handles quoted fields, escaped quotes, and CRLF/LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const clean = text.replace(/^﻿/, '');
  while (i < clean.length) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseGSheetUrl(url: string): { sheetId: string | null; gid: string } {
  const m = url.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (!m) return { sheetId: null, gid: '0' };
  const gidM = url.match(/gid=(\d+)/);
  return { sheetId: m[1], gid: gidM ? gidM[1] : '0' };
}

/** Fetch list of (gid, title) tab pairs from a Google Sheet's edit-page HTML. Server-side only. */
export async function fetchSheetTabs(sheetId: string): Promise<[string, string][]> {
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, { redirect: 'follow' });
    const text = await res.text();
    const titles = Array.from(text.matchAll(/"title"\s*:\s*"([^"]+)"/g)).map((m) => m[1]);
    const gids = Array.from(text.matchAll(/"gid"\s*:\s*"?(\d+)"?/g)).map((m) => m[1]);
    if (titles.length && gids.length) {
      const seen = new Set<string>();
      const pairs: [string, string][] = [];
      for (let i = 0; i < Math.min(titles.length, gids.length); i++) {
        const key = `${gids[i]}|${titles[i]}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push([gids[i], titles[i]]);
        }
      }
      return pairs.slice(0, 20);
    }
  } catch {
    // non-fatal — caller falls back to the gid from the URL
  }
  return [];
}

function findCol(headers: string[], name: string): string | null {
  const exact = headers.find((k) => k.trim().toLowerCase() === name.toLowerCase());
  if (exact) return exact;
  return headers.find((k) => k.trim().toLowerCase().includes(name.toLowerCase())) ?? null;
}

/** Core parser: raw rows (array of arrays of strings) → filtered clean briefing dicts. */
export function parseBriefingRawToRows(
  rawRows: string[][],
  channelCodes: Set<string>,
): { rows: BriefingRow[]; debug: string } {
  if (!rawRows.length) return { rows: [], debug: 'Sheet appears to be empty.' };

  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    if (rawRows[i].some((c) => /channel|campaign/i.test(c ?? ''))) {
      headerIdx = i;
      break;
    }
  }

  const headers = (rawRows[headerIdx] ?? []).map((h) => h ?? '');
  const dataRows = rawRows.slice(headerIdx + 1);
  const allDicts: Record<string, string>[] = [];
  for (const row of dataRows) {
    if (!row.some((c) => (c ?? '').trim())) continue;
    const dict: Record<string, string> = {};
    headers.forEach((h, i) => {
      dict[h] = row[i] ?? '';
    });
    allDicts.push(dict);
  }

  const colCh = findCol(headers, 'Channel_Code') ?? findCol(headers, 'Channel');
  const colCamp = findCol(headers, 'CAMPAIGN NAME') ?? findCol(headers, 'Campaign Name');
  const colAg = findCol(headers, 'AD SET NAME') ?? findCol(headers, 'Ad Set Name');
  const colCrea = findCol(headers, 'CREATIVE NAME') ?? findCol(headers, 'Creative Name');
  const colGoal = findCol(headers, 'Performance_Goal');
  const colPerf = findCol(headers, 'Goal_Code');
  const colCat = findCol(headers, 'Category_Code');
  const colSub = findCol(headers, 'SUbCategory_code') ?? findCol(headers, 'SubCategory_code');
  const colProd = findCol(headers, 'Product_code');
  const colKp = findCol(headers, 'Key_Product_code');
  const colMkt = findCol(headers, 'Market_Code');
  const colCty = findCol(headers, 'Country_Code');
  const colCrty = findCol(headers, 'Creative_Code');
  const colMon = findCol(headers, 'Month');
  const colBud = findCol(headers, 'Budget');
  const colCta = findCol(headers, 'CTA');
  const colLink = findCol(headers, 'Asset Link') ?? findCol(headers, 'Asset_Link');
  const colSd = findCol(headers, 'START DATE');
  const colEd = findCol(headers, 'END DATE');
  const colComm = findCol(headers, 'SHIMANO COMMENTS');

  const v = (d: Record<string, string>, col: string | null) => (col ? (d[col] ?? '').trim() : '');

  const chVals = colCh ? Array.from(new Set(allDicts.map((d) => v(d, colCh)).filter(Boolean))).sort() : [];
  const debug = `Header row: ${headerIdx} | Rows: ${allDicts.length} | Channel_Code col: "${colCh}" | Channel values: ${chVals} | camp=${colCamp}, ag=${colAg}, goal=${colGoal}, mkt=${colMkt}`;

  let lastCamp = '';
  let lastAg = '';
  const rows: BriefingRow[] = [];
  for (const d of allDicts) {
    const chCode = v(d, colCh).toUpperCase();
    if (!channelCodes.has(chCode)) continue;
    const campName = v(d, colCamp) || lastCamp;
    const agName = v(d, colAg) || lastAg;
    if (v(d, colCamp)) lastCamp = v(d, colCamp);
    if (v(d, colAg)) lastAg = v(d, colAg);
    rows.push({
      campaign_name: campName,
      adset_name: agName,
      creative_name: v(d, colCrea),
      goal_code: v(d, colGoal),
      perf_code: v(d, colPerf),
      category: v(d, colCat),
      subcategory: v(d, colSub),
      product: v(d, colProd),
      key_product: v(d, colKp),
      market_code: v(d, colMkt),
      country_code: v(d, colCty),
      creative_code: v(d, colCrty),
      month: v(d, colMon),
      budget: v(d, colBud),
      final_url: v(d, colCta),
      asset_link: v(d, colLink),
      start_date: v(d, colSd),
      end_date: v(d, colEd),
      shimano_comments: v(d, colComm),
      channel_code: chCode,
    });
  }
  return { rows, debug };
}

// ── Code → field lookup tables ────────────────────────────────────────────────

export const GOAL_CODE_TO_FB_OBJ: Record<string, string> = {
  CON: 'Traffic',
  AWA: 'Brand Awareness',
  CONV: 'Lead Generation',
  VV: 'Video Views',
  RCH: 'Reach',
  IMP: 'Traffic',
  DG: 'Outcome Awareness',
};

export const PERF_CODE_TO_OPT: Record<string, [string, string]> = {
  IMP: ['IMPRESSIONS', 'IMPRESSIONS'],
  VV: ['VIDEO_VIEWS', 'VIDEO_VIEWS'],
  RCH: ['REACH', 'IMPRESSIONS'],
  TRF: ['LINK_CLICKS', 'LINK_CLICKS'],
  CONV: ['OFFSITE_CONVERSIONS', 'IMPRESSIONS'],
  SUBS: ['VIDEO_VIEWS', 'VIDEO_VIEWS'],
  DG: ['IMPRESSIONS', 'IMPRESSIONS'],
};

export const CREATIVE_CODE_TO_TYPE: Record<string, string> = {
  IMG: 'Standard',
  VID: 'Page post ad',
  CAR: 'Page post ad',
};

export const MARKET_CODE_TO_COUNTRIES: Record<string, string[]> = {
  SEU: COUNTRY_GROUP_PRESETS['Europe'] ?? [],
  SGF: ['DE'], SIF: ['IT'], SFFT: ['FR'],
  SBXF: ['BE'], SEFH: ['HU'], SFTK: ['CZ'],
  SNF: ['NL'], SUK: ['UK'], SPOF: ['PL'],
  SSPF: ['ES', 'PT'],
};

export const GOAL_CODE_TO_GOOGLE_MAIN: Record<string, string> = {
  CON: 'Traffic',
  AWA: 'Awareness',
  CONV: 'Conversions',
  VV: 'Engagement',
  RCH: 'Awareness',
  IMP: 'Awareness',
  DG: 'Awareness',
};

export const PERF_CODE_TO_GOOGLE_PERF: Record<string, string> = {
  IMP: 'Impressions',
  VV: 'Video Views',
  RCH: 'Reach',
  TRF: 'Traffic',
  CONV: 'Conversions',
  SUBS: 'Subscribers',
  DG: 'Demand Gen',
};

const W_CODE_MAP: Record<string, string> = {
  GER: 'DE', ROM: 'RO', POR: 'PT',
  NL: 'NL', BE: 'BE', DE: 'DE', FR: 'FR', SE: 'SE',
  PL: 'PL', IT: 'IT', ES: 'ES', PT: 'PT', HU: 'HU',
  CZ: 'CZ', RO: 'RO', LIT: 'LIT', SLOW: 'SLOW',
  SLOV: 'SLOV', AUS: 'AUS', CRO: 'CRO', NO: 'NO',
  FI: 'FI', DK: 'DK', UK: 'UK',
};

export const MONTH_CODE_TO_MONTH: Record<string, string> = {
  JAN: 'January', FEB: 'February', MAR: 'March',
  APR: 'April', MAY: 'May', JUN: 'June',
  JUL: 'July', AUG: 'August', SEPT: 'September',
  OCT: 'October', NOV: 'November', DEC: 'December',
};

/** Extract country codes from the free-text "SHIMANO COMMENTS" column. */
export function parseCountriesFromW(text: string): string[] {
  if (!text) return [];
  const normalised = text.replace(/[\r\n]+/g, ' | ');
  let countryStr = '';
  const targetMatch = normalised.match(/[Tt]arget\s*(?:anglers\s+in|:)\s*([\w,/\s]+?)(?:\s*\||$)/);
  if (targetMatch) {
    countryStr = targetMatch[1];
  } else {
    const parts = normalised.split('|');
    for (const part of parts) {
      const trimmed = part.trim();
      if (/\b[A-Z]{2,4}\b/.test(trimmed)) {
        countryStr = trimmed;
        break;
      }
    }
  }
  const raw = countryStr.trim().split(/[,/]\s*/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of raw) {
    const code = token.trim().toUpperCase();
    const mapped = W_CODE_MAP[code];
    if (mapped && !seen.has(mapped) && COUNTRY_OPTIONS.includes(mapped)) {
      result.push(mapped);
      seen.add(mapped);
    }
  }
  return result;
}

export function parseBriefingDate(s: string | undefined): string {
  const str = (s ?? '').trim();
  if (!str) return '';
  // Try dd/mm/yyyy, yyyy-mm-dd, mm/dd/yyyy, dd-mm-yyyy — normalise to yyyy-mm-dd (HTML date input format)
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

export function parseBriefingBudget(s: string | undefined): number {
  const cleaned = (s ?? '').replace(/[€,\s£$]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function fmtNameDate(dateStr: string): string {
  const parsed = parseBriefingDate(dateStr);
  if (!parsed) return '';
  const [y, m, d] = parsed.split('-');
  return `${d}.${m}.${y}`;
}

/** Build campaign and ad set names from briefing code columns (exact naming convention). */
export function buildYtNames(r: BriefingRow): { campaignName: string; adsetName: string } {
  const ab = r.channel_code;
  const ac = r.perf_code;
  const ae = r.category;
  const af = r.subcategory;
  const ag = r.product;
  let ah = r.key_product;
  if (ah === '_') ah = '';
  const ai = r.market_code;
  const aj = r.country_code;
  const sd = fmtNameDate(r.start_date);
  const ed = fmtNameDate(r.end_date);

  const campParts = [ab, ac, ae, af, ag, ai, aj, sd, ed].filter(Boolean);
  if (ah === 'KC') campParts.push('KC');

  const agParts = [ab, ac, ae, af, ag, ai, ah, aj, sd, ed].filter(Boolean);

  return { campaignName: campParts.join('_'), adsetName: agParts.join('_') };
}
