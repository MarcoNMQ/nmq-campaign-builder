'use client';

import { useBuilderStore } from '@/lib/store';
import {
  FB_CAMPAIGN_OBJECTIVES, FB_BUYING_TYPES, FB_CAMPAIGN_BID_STRATEGIES,
  FB_ADSET_BID_STRATEGIES, FB_OPTIMIZATION_GOALS, FB_BILLING_EVENTS,
  FB_PUBLISHER_PLATFORMS, FB_DEVICE_PLATFORMS, FB_FACEBOOK_POSITIONS,
  FB_INSTAGRAM_POSITIONS, FB_STATUSES,
} from '@/lib/fbConstants';
import { COUNTRY_OPTIONS } from '@/lib/constants';
import { Field, Select, TextInput } from '@/components/Field';
import type { FbCampaign } from '@/lib/types';

function MultiToggle({
  options, values, onChange,
}: { options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = values.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(active ? values.filter((v) => v !== o) : [...values, o])}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-teal-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function FbCampaignForm({ campaignId }: { campaignId: string }) {
  const campaign = useBuilderStore((s) => s.fbCampaigns.find((c) => c.id === campaignId));
  const update = useBuilderStore((s) => s.updateFbCampaign);

  if (!campaign) return null;

  function patch(p: Partial<FbCampaign>) {
    update(campaignId, p);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h2 className="text-lg font-bold text-[#1F3864]">Campaign</h2>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Campaign name">
          <TextInput value={campaign.campaign_name} onChange={(e) => patch({ campaign_name: e.target.value })} />
        </Field>
        <Field label="Ad set name">
          <TextInput value={campaign.adset_name} onChange={(e) => patch({ adset_name: e.target.value })} />
        </Field>
        <Field label="Campaign objective">
          <Select value={campaign.campaign_objective} onChange={(e) => patch({ campaign_objective: e.target.value })}>
            <option value="">—</option>
            {FB_CAMPAIGN_OBJECTIVES.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Buying type">
          <Select value={campaign.buying_type} onChange={(e) => patch({ buying_type: e.target.value })}>
            {FB_BUYING_TYPES.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Campaign bid strategy">
          <Select value={campaign.campaign_bid_strategy} onChange={(e) => patch({ campaign_bid_strategy: e.target.value })}>
            <option value="">—</option>
            {FB_CAMPAIGN_BID_STRATEGIES.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Campaign status">
          <Select value={campaign.campaign_status} onChange={(e) => patch({ campaign_status: e.target.value })}>
            {FB_STATUSES.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Campaign budget type">
          <Select value={campaign.budget_type} onChange={(e) => patch({ budget_type: e.target.value as 'Daily' | 'Lifetime' })}>
            <option value="Daily">Daily</option>
            <option value="Lifetime">Lifetime</option>
          </Select>
        </Field>
        <Field label="Campaign budget (€)">
          <TextInput type="number" min={0} step="0.01" value={campaign.budget} onChange={(e) => patch({ budget: Number(e.target.value) })} />
        </Field>
        <Field label="Start time">
          <TextInput type="date" value={campaign.campaign_start_time} onChange={(e) => patch({ campaign_start_time: e.target.value })} />
        </Field>
        <Field label="Stop time">
          <TextInput type="date" value={campaign.campaign_stop_time} onChange={(e) => patch({ campaign_stop_time: e.target.value })} />
        </Field>
      </div>

      <h3 className="text-sm font-semibold text-zinc-600">Ad set targeting</h3>

      <Field label="Countries">
        <MultiToggle
          options={COUNTRY_OPTIONS}
          values={campaign.countries}
          onChange={(v) => patch({ countries: v })}
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Gender">
          <Select value={campaign.gender} onChange={(e) => patch({ gender: e.target.value })}>
            <option value="All">All</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </Select>
        </Field>
        <Field label="Age min">
          <TextInput type="number" min={13} max={65} value={campaign.age_min ?? ''} onChange={(e) => patch({ age_min: Number(e.target.value) })} />
        </Field>
        <Field label="Age max">
          <TextInput type="number" min={13} max={65} value={campaign.age_max ?? ''} onChange={(e) => patch({ age_max: Number(e.target.value) })} />
        </Field>
      </div>

      <Field label="Publisher platforms">
        <MultiToggle options={FB_PUBLISHER_PLATFORMS} values={campaign.publisher_platforms} onChange={(v) => patch({ publisher_platforms: v })} />
      </Field>
      <Field label="Device platforms">
        <MultiToggle options={FB_DEVICE_PLATFORMS} values={campaign.device_platforms} onChange={(v) => patch({ device_platforms: v })} />
      </Field>
      <Field label="Facebook positions">
        <MultiToggle options={FB_FACEBOOK_POSITIONS} values={campaign.facebook_positions} onChange={(v) => patch({ facebook_positions: v })} />
      </Field>
      <Field label="Instagram positions">
        <MultiToggle options={FB_INSTAGRAM_POSITIONS} values={campaign.instagram_positions} onChange={(v) => patch({ instagram_positions: v })} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Optimization goal">
          <Select value={campaign.optimization_goal} onChange={(e) => patch({ optimization_goal: e.target.value })}>
            <option value="">—</option>
            {FB_OPTIMIZATION_GOALS.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Billing event">
          <Select value={campaign.billing_event} onChange={(e) => patch({ billing_event: e.target.value })}>
            <option value="">—</option>
            {FB_BILLING_EVENTS.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Ad set bid strategy">
          <Select value={campaign.adset_bid_strategy} onChange={(e) => patch({ adset_bid_strategy: e.target.value })}>
            <option value="">—</option>
            {FB_ADSET_BID_STRATEGIES.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Bid amount (€)">
          <TextInput type="number" min={0} step="0.01" value={campaign.bid_amount ?? ''} onChange={(e) => patch({ bid_amount: Number(e.target.value) })} />
        </Field>
      </div>
    </div>
  );
}
