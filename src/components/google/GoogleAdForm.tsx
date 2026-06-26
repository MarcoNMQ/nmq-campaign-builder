'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/lib/store';
import { CharCount, Field, TextInput } from '@/components/Field';
import type { GoogleAd } from '@/lib/types';

export function GoogleAdForm({ campaignId, adId }: { campaignId: string; adId: string }) {
  const campaign = useBuilderStore((s) => s.googleCampaigns.find((c) => c.id === campaignId));
  const ad = campaign?.ads.find((a) => a.id === adId);
  const updateAd = useBuilderStore((s) => s.updateGoogleAd);
  const removeAd = useBuilderStore((s) => s.removeGoogleAd);
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!campaign || !ad) return null;
  const safeCampaign = campaign;
  const safeAd = ad;

  function patch(p: Partial<GoogleAd>) {
    updateAd(campaignId, adId, p);
  }

  async function handleVideoUrlBlur(url: string) {
    const match = url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
    const videoId = match ? match[1] : url.trim();
    if (!videoId) return;
    patch({ video_id: videoId });
    setFetchingTitle(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube-title?id=${encodeURIComponent(videoId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title && !safeAd.ad_name) patch({ ad_name: data.title });
      }
    } catch {
      // non-fatal — title fetch is a convenience, not required
    } finally {
      setFetchingTitle(false);
    }
  }

  async function handleGenerateCopy() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: safeAd.ad_name,
          productCategory: safeCampaign.product_category,
          productPromoted: safeCampaign.product_promoted,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      patch({
        headline_1: data.headlines?.[0] ?? safeAd.headline_1,
        headline_2: data.headlines?.[1] ?? safeAd.headline_2,
        headline_3: data.headlines?.[2] ?? safeAd.headline_3,
        headline_4: data.headlines?.[3] ?? safeAd.headline_4,
        headline_5: data.headlines?.[4] ?? safeAd.headline_5,
        long_headline_1: data.longHeadlines?.[0] ?? safeAd.long_headline_1,
        long_headline_2: data.longHeadlines?.[1] ?? safeAd.long_headline_2,
        long_headline_3: data.longHeadlines?.[2] ?? safeAd.long_headline_3,
        long_headline_4: data.longHeadlines?.[3] ?? safeAd.long_headline_4,
        long_headline_5: data.longHeadlines?.[4] ?? safeAd.long_headline_5,
        description_1: data.descriptions?.[0] ?? safeAd.description_1,
        description_2: data.descriptions?.[1] ?? safeAd.description_2,
        description_3: data.descriptions?.[2] ?? safeAd.description_3,
        description_4: data.descriptions?.[3] ?? safeAd.description_4,
        description_5: data.descriptions?.[4] ?? safeAd.description_5,
      });
    } catch {
      setError('Copy generation failed — check the Anthropic API key is set.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Ad</h2>
        <button
          onClick={() => removeAd(campaignId, adId)}
          className="text-sm text-red-500 hover:underline"
        >
          Delete ad
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Ad name">
          <TextInput value={ad.ad_name} onChange={(e) => patch({ ad_name: e.target.value })} />
        </Field>
        <Field label="YouTube URL or Video ID" hint={fetchingTitle ? 'Fetching title…' : undefined}>
          <TextInput
            defaultValue={ad.video_id}
            onBlur={(e) => handleVideoUrlBlur(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
        </Field>
      </div>

      <Field label="Final URL">
        <TextInput value={ad.final_url} onChange={(e) => patch({ final_url: e.target.value })} placeholder="https://shimanofishing.com/..." />
      </Field>

      <div className="flex items-center justify-between rounded-md bg-ink-50 px-3 py-2">
        <span className="text-sm text-ink-500">Generate copy from video title + product info</span>
        <button
          onClick={handleGenerateCopy}
          disabled={generating || !ad.ad_name}
          className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {generating ? 'Generating…' : '✨ Generate with AI'}
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}

      <CopyGroup
        title="Headlines"
        max={30}
        values={[ad.headline_1, ad.headline_2, ad.headline_3, ad.headline_4, ad.headline_5]}
        onChange={(i, v) => patch({ [`headline_${i + 1}`]: v } as Partial<GoogleAd>)}
      />
      <CopyGroup
        title="Long headlines"
        max={90}
        values={[ad.long_headline_1, ad.long_headline_2, ad.long_headline_3, ad.long_headline_4, ad.long_headline_5]}
        onChange={(i, v) => patch({ [`long_headline_${i + 1}`]: v } as Partial<GoogleAd>)}
      />
      <CopyGroup
        title="Descriptions"
        max={90}
        values={[ad.description_1, ad.description_2, ad.description_3, ad.description_4, ad.description_5]}
        onChange={(i, v) => patch({ [`description_${i + 1}`]: v } as Partial<GoogleAd>)}
      />
    </div>
  );
}

function CopyGroup({
  title, max, values, onChange,
}: { title: string; max: number; values: string[]; onChange: (i: number, v: string) => void }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink-600">{title}</h3>
      <div className="grid grid-cols-5 gap-2">
        {values.map((v, i) => (
          <div key={i} className="flex flex-col gap-1">
            <TextInput value={v} onChange={(e) => onChange(i, e.target.value)} />
            <CharCount value={v} max={max} />
          </div>
        ))}
      </div>
    </div>
  );
}
