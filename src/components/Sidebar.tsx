'use client';

import { useMemo, useState } from 'react';
import { useBuilderStore } from '@/lib/store';
import { validateCampaigns } from '@/lib/builder';
import { validateFbCampaigns } from '@/lib/fbBuilder';

export function Sidebar() {
  const platform = useBuilderStore((s) => s.platform);
  const setPlatform = useBuilderStore((s) => s.setPlatform);
  const googleCampaigns = useBuilderStore((s) => s.googleCampaigns);
  const fbCampaigns = useBuilderStore((s) => s.fbCampaigns);
  const addGoogleCampaign = useBuilderStore((s) => s.addGoogleCampaign);
  const addFbCampaign = useBuilderStore((s) => s.addFbCampaign);
  const removeGoogleCampaign = useBuilderStore((s) => s.removeGoogleCampaign);
  const removeFbCampaign = useBuilderStore((s) => s.removeFbCampaign);
  const duplicateGoogleCampaign = useBuilderStore((s) => s.duplicateGoogleCampaign);
  const duplicateFbCampaign = useBuilderStore((s) => s.duplicateFbCampaign);
  const selected = useBuilderStore((s) => s.selected);
  const setSelected = useBuilderStore((s) => s.setSelected);
  const expanded = useBuilderStore((s) => s.expanded);
  const toggleExpanded = useBuilderStore((s) => s.toggleExpanded);

  const [exporting, setExporting] = useState(false);

  const campaigns = platform === 'google' ? googleCampaigns : fbCampaigns;
  const errors = useMemo(
    () => (platform === 'google' ? validateCampaigns(googleCampaigns) : validateFbCampaigns(fbCampaigns)),
    [platform, googleCampaigns, fbCampaigns],
  );

  const totalAds = campaigns.reduce((n, c) => n + c.ads.length, 0);
  const totalBudget = campaigns.reduce((n, c) => n + (Number(c.budget) || 0), 0);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, campaigns }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = platform === 'google' ? 'google_ads_campaigns.csv' : 'facebook_campaigns.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <aside className="flex h-screen w-80 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-3">
        <div className="flex rounded-md bg-zinc-100 p-1 text-sm font-medium">
          <button
            className={`flex-1 rounded-md py-1.5 transition ${platform === 'google' ? 'bg-white text-[#1F3864] shadow' : 'text-zinc-500'}`}
            onClick={() => setPlatform('google')}
          >
            Google
          </button>
          <button
            className={`flex-1 rounded-md py-1.5 transition ${platform === 'facebook' ? 'bg-white text-[#1F3864] shadow' : 'text-zinc-500'}`}
            onClick={() => setPlatform('facebook')}
          >
            Facebook
          </button>
        </div>
      </div>

      <div className="p-3">
        <button
          className="w-full rounded-md bg-teal-500 py-2 text-sm font-semibold text-white transition hover:bg-teal-600"
          onClick={() => setSelected({ type: 'new_campaign' })}
        >
          + New Campaign
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {campaigns.length === 0 && (
          <p className="px-2 py-4 text-sm text-zinc-400">No campaigns yet.</p>
        )}
        {campaigns.map((c) => {
          const isOpen = expanded[c.id] ?? true;
          const isSelected = selected.type === 'campaign' && selected.campaignId === c.id;
          return (
            <div key={c.id} className="mb-1">
              <div
                className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${isSelected ? 'bg-teal-50 text-[#1F3864]' : 'text-zinc-700 hover:bg-zinc-50'}`}
              >
                <button onClick={() => toggleExpanded(c.id)} className="text-zinc-400">
                  {isOpen ? '▾' : '▸'}
                </button>
                <button
                  className="flex-1 truncate text-left"
                  onClick={() => setSelected({ type: 'campaign', campaignId: c.id })}
                  title={c.campaign_name}
                >
                  {c.campaign_name || '(unnamed campaign)'}
                </button>
                <button
                  className="opacity-0 group-hover:opacity-100"
                  title="Duplicate"
                  onClick={() => (platform === 'google' ? duplicateGoogleCampaign(c.id) : duplicateFbCampaign(c.id))}
                >
                  📋
                </button>
                <button
                  className="opacity-0 group-hover:opacity-100"
                  title="Delete"
                  onClick={() => (platform === 'google' ? removeGoogleCampaign(c.id) : removeFbCampaign(c.id))}
                >
                  🗑
                </button>
              </div>
              {isOpen && (
                <div className="ml-5 border-l border-zinc-200 pl-2">
                  <button
                    className={`block w-full truncate rounded-md px-2 py-1 text-left text-xs ${selected.type === 'adgroup' && selected.campaignId === c.id ? 'bg-teal-50 text-[#1F3864]' : 'text-zinc-500 hover:bg-zinc-50'}`}
                    onClick={() => setSelected({ type: 'adgroup', campaignId: c.id })}
                  >
                    {c.adset_name || '(ad group)'} · {c.ads.length} ad{c.ads.length === 1 ? '' : 's'}
                  </button>
                  {c.ads.map((ad) => (
                    <button
                      key={ad.id}
                      className={`block w-full truncate rounded-md px-2 py-1 text-left text-xs ${selected.type === 'ad' && selected.adId === ad.id ? 'bg-teal-50 text-[#1F3864]' : 'text-zinc-400 hover:bg-zinc-50'}`}
                      onClick={() => setSelected({ type: 'ad', campaignId: c.id, adId: ad.id })}
                    >
                      {('ad_name' in ad && ad.ad_name) || '(unnamed ad)'}
                    </button>
                  ))}
                  <button
                    className="block w-full truncate rounded-md px-2 py-1 text-left text-xs text-teal-600 hover:bg-zinc-50"
                    onClick={() => setSelected({ type: 'new_ad', campaignId: c.id })}
                  >
                    + Add ad
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-zinc-200 p-3 text-xs text-zinc-500">
        {campaigns.length} campaign{campaigns.length === 1 ? '' : 's'} · {totalAds} ad{totalAds === 1 ? '' : 's'} · €{totalBudget.toFixed(2)} budget
      </div>

      {errors.length > 0 && (
        <details className="border-t border-zinc-200 px-3 py-2 text-xs text-red-600">
          <summary className="cursor-pointer font-medium">{errors.length} validation issue{errors.length === 1 ? '' : 's'}</summary>
          <ul className="mt-1 list-disc pl-4">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="border-t border-zinc-200 p-3">
        <button
          disabled={exporting || campaigns.length === 0}
          onClick={handleExport}
          className="w-full rounded-md bg-zinc-900 py-2 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:opacity-40"
        >
          {exporting ? 'Exporting…' : platform === 'google' ? 'Export CSV' : 'Export Excel'}
        </button>
      </div>
    </aside>
  );
}
