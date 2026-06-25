'use client';

import { useEffect } from 'react';
import { useBuilderStore } from '@/lib/store';
import { generateAdsetName, generateCampaignName } from '@/lib/builder';
import {
  CHANNELS, MAIN_GOALS, PERF_GOALS, PRODUCT_CATEGORIES, PRODUCT_TAXONOMY,
  MARKETS, MONTHS, CTAS, BID_STRATEGIES, COUNTRY_OPTIONS, MARKET_TO_GROUP,
  COUNTRY_GROUP_PRESETS, COUNTRY_GROUPS,
} from '@/lib/constants';
import { Field, Select, TextInput } from '@/components/Field';
import type { GoogleCampaign } from '@/lib/types';

export function GoogleCampaignForm({ campaignId }: { campaignId: string }) {
  const campaign = useBuilderStore((s) => s.googleCampaigns.find((c) => c.id === campaignId));
  const update = useBuilderStore((s) => s.updateGoogleCampaign);

  // Keep computed names in sync whenever the inputs that feed them change
  useEffect(() => {
    if (!campaign) return;
    const name = generateCampaignName(campaign);
    const adsetName = generateAdsetName(campaign);
    if (name !== campaign.campaign_name || adsetName !== campaign.adset_name) {
      update(campaignId, { campaign_name: name, adset_name: adsetName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    campaign?.channel, campaign?.main_goal, campaign?.perf_goal, campaign?.month,
    campaign?.product_category, campaign?.product_subcategory, campaign?.product_promoted,
    campaign?.market, campaign?.key_category, campaign?.country_group,
    campaign?.start_date, campaign?.end_date,
  ]);

  if (!campaign) return null;

  function patch(p: Partial<GoogleCampaign>) {
    update(campaignId, p);
  }

  function onMarketChange(market: string) {
    const group = MARKET_TO_GROUP[market] ?? '';
    const countries = COUNTRY_GROUP_PRESETS[group] ?? [];
    patch({ market, country_group: group, countries });
  }

  const families = campaign.product_category ? Object.keys(PRODUCT_TAXONOMY[campaign.product_category] ?? {}) : [];
  const products = campaign.product_subcategory
    ? PRODUCT_TAXONOMY[campaign.product_category]?.[campaign.product_subcategory] ?? []
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-bold text-[#1F3864]">Campaign</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Campaign name: <span className="font-mono text-zinc-700">{campaign.campaign_name || '—'}</span>
        </p>
        <p className="text-sm text-zinc-500">
          Ad group name: <span className="font-mono text-zinc-700">{campaign.adset_name || '—'}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Channel">
          <Select value={campaign.channel} onChange={(e) => patch({ channel: e.target.value })}>
            {CHANNELS.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Main goal">
          <Select value={campaign.main_goal} onChange={(e) => patch({ main_goal: e.target.value })}>
            {MAIN_GOALS.map((g) => <option key={g}>{g}</option>)}
          </Select>
        </Field>
        <Field label="Performance goal">
          <Select value={campaign.perf_goal} onChange={(e) => patch({ perf_goal: e.target.value })}>
            {PERF_GOALS.map((g) => <option key={g}>{g}</option>)}
          </Select>
        </Field>
        <Field label="Month">
          <Select value={campaign.month} onChange={(e) => patch({ month: e.target.value })}>
            <option value="">—</option>
            {MONTHS.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Product category">
          <Select
            value={campaign.product_category}
            onChange={(e) => patch({ product_category: e.target.value, product_subcategory: '', product_promoted: '' })}
          >
            <option value="">—</option>
            {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Product family">
          <Select
            value={campaign.product_subcategory}
            onChange={(e) => patch({ product_subcategory: e.target.value, product_promoted: '' })}
            disabled={!families.length}
          >
            <option value="">—</option>
            {families.map((f) => <option key={f}>{f}</option>)}
          </Select>
        </Field>
        <Field label="Product promoted">
          <Select
            value={campaign.product_promoted}
            onChange={(e) => patch({ product_promoted: e.target.value })}
            disabled={!products.length}
          >
            <option value="">—</option>
            {products.map((p) => <option key={p}>{p}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Market">
          <Select value={campaign.market} onChange={(e) => onMarketChange(e.target.value)}>
            <option value="">—</option>
            {MARKETS.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Country group">
          <Select
            value={campaign.country_group}
            onChange={(e) => patch({ country_group: e.target.value, countries: COUNTRY_GROUP_PRESETS[e.target.value] ?? [] })}
          >
            <option value="">—</option>
            {COUNTRY_GROUPS.map((g) => <option key={g}>{g}</option>)}
          </Select>
        </Field>
        <Field label="Key category">
          <Select value={campaign.key_category} onChange={(e) => patch({ key_category: e.target.value as 'YES' | 'NO' })}>
            <option value="NO">No</option>
            <option value="YES">Yes</option>
          </Select>
        </Field>
      </div>

      <Field label="Countries" hint="Auto-filled from country group, adjust as needed">
        <div className="flex flex-wrap gap-2">
          {COUNTRY_OPTIONS.map((code) => {
            const active = campaign.countries.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() =>
                  patch({
                    countries: active
                      ? campaign.countries.filter((c) => c !== code)
                      : [...campaign.countries, code],
                  })
                }
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-teal-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}
              >
                {code}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Location targeting level" hint="Whether the country targeting applies to the whole campaign or just this ad group">
        <div className="flex rounded-md bg-zinc-100 p-1 text-sm font-medium w-fit">
          <button
            type="button"
            className={`rounded-md px-3 py-1 transition ${campaign.location_level === 'campaign' ? 'bg-white text-[#1F3864] shadow' : 'text-zinc-500'}`}
            onClick={() => patch({ location_level: 'campaign' })}
          >
            Campaign level
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1 transition ${campaign.location_level === 'adgroup' ? 'bg-white text-[#1F3864] shadow' : 'text-zinc-500'}`}
            onClick={() => patch({ location_level: 'adgroup' })}
          >
            Ad group level
          </button>
        </div>
      </Field>

      <h3 className="text-sm font-semibold text-zinc-600">Editor settings</h3>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Networks" hint="Semicolon-separated, exactly as the Editor expects">
          <TextInput value={campaign.networks} onChange={(e) => patch({ networks: e.target.value })} />
        </Field>
        <Field label="Languages">
          <TextInput value={campaign.languages} onChange={(e) => patch({ languages: e.target.value })} />
        </Field>
        <Field label="Labels" hint="Leave blank to auto-generate from month + year">
          <TextInput value={campaign.labels} onChange={(e) => patch({ labels: e.target.value })} placeholder={campaign.month && campaign.end_date ? undefined : 'e.g. JUN;2026'} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date">
          <TextInput type="date" value={campaign.start_date} onChange={(e) => patch({ start_date: e.target.value })} />
        </Field>
        <Field label="End date">
          <TextInput type="date" value={campaign.end_date} onChange={(e) => patch({ end_date: e.target.value })} />
        </Field>
        <Field label="Budget (€/day)">
          <TextInput type="number" min={0} step="0.01" value={campaign.budget} onChange={(e) => patch({ budget: Number(e.target.value) })} />
        </Field>
        <Field label="Bid strategy">
          <Select value={campaign.bid_strategy} onChange={(e) => patch({ bid_strategy: e.target.value })}>
            <option value="">—</option>
            {BID_STRATEGIES.map((b) => <option key={b}>{b}</option>)}
          </Select>
        </Field>
        <Field label="Default CTA">
          <Select value={campaign.cta} onChange={(e) => patch({ cta: e.target.value })}>
            <option value="">—</option>
            {CTAS.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
      </div>
    </div>
  );
}
