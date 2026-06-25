import { NextRequest, NextResponse } from 'next/server';
import { buildCsv } from '@/lib/builder';
import { buildFbExcel } from '@/lib/fbBuilder';
import type { FbCampaign, GoogleCampaign } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { platform, campaigns } = await req.json();

  if (platform === 'google') {
    const csv = buildCsv(campaigns as GoogleCampaign[]);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="google_ads_campaigns.csv"',
      },
    });
  }

  if (platform === 'facebook') {
    const buffer = await buildFbExcel(campaigns as FbCampaign[]);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="facebook_campaigns.xlsx"',
      },
    });
  }

  return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
}
