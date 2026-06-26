// Ported 1:1 from shimano_campaign_builder/builder.py — Google Ads CSV building + validation

import {
  CSV_HEADERS, NETWORKS, EU_POL, BIZ, LOGO,
  CAMP_TYPE, LANGUAGES, BUDGET_TYPE, CAMP_STATUS,
  COUNTRY_MAP, MONTH_CODES,
} from './constants';
import { generateName } from './naming/generateName';
import { getConventionForClient } from './naming/templates';
import { shimanoCampaignFormula, shimanoAdGroupFormula } from './naming/shimano';
import { defaultCampaignFormula, defaultAdGroupFormula } from './naming/generic';
import type { GoogleAd, GoogleCampaign } from './types';

// Naming logic now lives in src/lib/naming/ (see that folder for the
// formulas/engine). These wrappers keep the exact same exported names and
// signatures so every existing call site (GoogleCampaignForm.tsx) needs no
// changes — they just pick the right convention by client_profile.
export function generateCampaignName(c: Partial<GoogleCampaign>): string {
  const convention = getConventionForClient(c.client_profile ?? '');
  const formula = convention.clientMode === 'shimano' ? shimanoCampaignFormula : defaultCampaignFormula;
  return generateName(formula.resolve(c));
}

export function generateAdsetName(c: Partial<GoogleCampaign>): string {
  const convention = getConventionForClient(c.client_profile ?? '');
  const formula = convention.clientMode === 'shimano' ? shimanoAdGroupFormula : defaultAdGroupFormula;
  return generateName(formula.resolve(c));
}

type CsvRow = Record<string, string>;

function emptyRow(): CsvRow {
  const row: CsvRow = {};
  for (const h of CSV_HEADERS) row[h] = '';
  return row;
}

function defaultLabels(c: GoogleCampaign): string {
  const monthCode = MONTH_CODES[c.month ?? ''] ?? '';
  const year = c.end_date ? String(c.end_date).slice(0, 4) : '';
  return monthCode && year ? `${monthCode};${year}` : '';
}

function buildCampaignRow(c: GoogleCampaign): CsvRow {
  const row = emptyRow();

  row['Campaign'] = c.campaign_name;
  row['Campaign Type'] = CAMP_TYPE;
  row['Networks'] = c.networks || NETWORKS;
  row['Budget'] = Number(c.budget ?? 0).toFixed(2);
  row['Budget type'] = BUDGET_TYPE;
  row['EU political ads'] = EU_POL;
  row['Languages'] = c.languages || LANGUAGES;
  row['Bid Strategy Type'] = c.bid_strategy ?? '';
  row['Start Date'] = c.start_date ? String(c.start_date) : '';
  row['End Date'] = String(c.end_date ?? '');
  row['Campaign Status'] = CAMP_STATUS;
  row['Labels'] = c.labels || defaultLabels(c);
  return row;
}

function buildAdgroupRow(c: GoogleCampaign): CsvRow {
  const row = emptyRow();
  row['Campaign'] = c.campaign_name;
  row['Ad Group'] = c.adset_name;
  row['Ad Group Status'] = 'Enabled';
  row['Max CPC'] = c.max_cpc != null ? String(c.max_cpc) : '';
  row['Max CPM'] = c.max_cpm != null ? String(c.max_cpm) : '';
  row['Target CPV'] = c.target_cpv != null ? String(c.target_cpv) : '';
  row['Target CPM'] = c.target_cpm != null ? String(c.target_cpm) : '';
  return row;
}

function buildLocationRows(c: GoogleCampaign): CsvRow[] {
  const rows: CsvRow[] = [];
  for (const code of c.countries ?? []) {
    const country = COUNTRY_MAP[code];
    if (!country) continue;
    const row = emptyRow();
    row['Campaign'] = c.campaign_name;
    // Editor infers the targeting level from which columns are populated:
    // leaving Ad Group blank here makes the location apply at campaign level.
    if (c.location_level !== 'campaign') {
      row['Ad Group'] = c.adset_name;
    }
    row['Location'] = country;
    rows.push(row);
  }
  return rows;
}

function buildAdRow(c: GoogleCampaign, ad: GoogleAd): CsvRow {
  const row = emptyRow();
  row['Campaign'] = c.campaign_name;
  row['Ad Group'] = c.adset_name;
  row['Ad type'] = 'Demand Gen video ad';
  row['Ad Name'] = ad.ad_name ?? '';
  row['Video ID 1'] = ad.video_id ?? '';
  row['Headline 1'] = ad.headline_1 ?? '';
  row['Headline 2'] = ad.headline_2 ?? '';
  row['Headline 3'] = ad.headline_3 ?? '';
  row['Headline 4'] = ad.headline_4 ?? '';
  row['Headline 5'] = ad.headline_5 ?? '';
  row['Headline 6'] = ad.headline_6 ?? '';
  row['Headline 7'] = ad.headline_7 ?? '';
  row['Headline 8'] = ad.headline_8 ?? '';
  row['Headline 9'] = ad.headline_9 ?? '';
  row['Headline 10'] = ad.headline_10 ?? '';
  row['Headline 11'] = ad.headline_11 ?? '';
  row['Headline 12'] = ad.headline_12 ?? '';
  row['Headline 13'] = ad.headline_13 ?? '';
  row['Headline 14'] = ad.headline_14 ?? '';
  row['Headline 15'] = ad.headline_15 ?? '';
  row['Long headline 1'] = ad.long_headline_1 ?? '';
  row['Long headline 2'] = ad.long_headline_2 ?? '';
  row['Long headline 3'] = ad.long_headline_3 ?? '';
  row['Long headline 4'] = ad.long_headline_4 ?? '';
  row['Long headline 5'] = ad.long_headline_5 ?? '';
  row['Description 1'] = ad.description_1 ?? '';
  row['Description 2'] = ad.description_2 ?? '';
  row['Description 3'] = ad.description_3 ?? '';
  row['Description 4'] = ad.description_4 ?? '';
  row['Description 5'] = ad.description_5 ?? '';
  row['Business name'] = BIZ;
  row['Logo image'] = LOGO;
  row['Call to action'] = ad.cta ?? c.cta ?? '';
  row['Final URL'] = ad.final_url ?? '';
  row['Status'] = 'Enabled';
  return row;
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Assemble all rows in the correct Editor order:
 * For each campaign: campaign row → ad group row → location rows.
 * Then all ad rows at the end (grouped by campaign).
 */
export function buildCsv(campaigns: GoogleCampaign[]): string {
  const allRows: CsvRow[] = [];
  const adRows: CsvRow[] = [];

  for (const c of campaigns) {
    allRows.push(buildCampaignRow(c));
    allRows.push(buildAdgroupRow(c));
    allRows.push(...buildLocationRows(c));
    for (const ad of c.ads ?? []) {
      adRows.push(buildAdRow(c, ad));
    }
  }

  allRows.push(...adRows);

  const lines = [CSV_HEADERS.join(',')];
  for (const row of allRows) {
    lines.push(CSV_HEADERS.map((h) => csvEscape(row[h] ?? '')).join(','));
  }

  // UTF-8 BOM so Editor reads special chars correctly
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function validateCampaigns(campaigns: GoogleCampaign[]): string[] {
  const errors: string[] = [];
  if (!campaigns || campaigns.length === 0) {
    errors.push('Add at least one campaign before generating.');
    return errors;
  }

  campaigns.forEach((c, i) => {
    const label = `Campaign ${i + 1} (${c.campaign_name || '—'})`;
    if (!c.end_date) errors.push(`${label}: End Date is required.`);
    if (!c.countries || c.countries.length === 0) errors.push(`${label}: Select at least one country.`);
    if (!c.ads || c.ads.length === 0) errors.push(`${label}: Add at least one ad.`);

    (c.ads ?? []).forEach((ad, j) => {
      const adLabel = `${label} › Ad ${j + 1}`;
      for (let k = 1; k <= 15; k++) {
        const h = (ad as unknown as Record<string, string>)[`headline_${k}`] ?? '';
        if (h && h.length > 30) errors.push(`${adLabel} › Headline ${k} is ${h.length} chars (max 30).`);
      }
      for (let k = 1; k <= 5; k++) {
        const lh = (ad as unknown as Record<string, string>)[`long_headline_${k}`] ?? '';
        if (lh && lh.length > 90) errors.push(`${adLabel} › Long Headline ${k} is ${lh.length} chars (max 90).`);
        const d = (ad as unknown as Record<string, string>)[`description_${k}`] ?? '';
        if (d && d.length > 90) errors.push(`${adLabel} › Description ${k} is ${d.length} chars (max 90).`);
      }
      const hasLongHeadline = [1, 2, 3, 4, 5].some(
        (k) => (ad as unknown as Record<string, string>)[`long_headline_${k}`],
      );
      if (!hasLongHeadline) errors.push(`${adLabel}: At least one Long Headline is required.`);
    });
  });

  return errors;
}
