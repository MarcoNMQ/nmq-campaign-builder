import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const TOOL_NAME = 'submit_ad_copy';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
  }

  const { videoTitle, productCategory, productPromoted } = await req.json();
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    tools: [
      {
        name: TOOL_NAME,
        description: 'Submit generated Google Demand Gen ad copy.',
        input_schema: {
          type: 'object',
          properties: {
            headlines: { type: 'array', items: { type: 'string' }, minItems: 15, maxItems: 15, description: 'Max 30 characters each' },
            longHeadlines: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5, description: 'Max 90 characters each' },
            descriptions: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5, description: 'Max 90 characters each' },
          },
          required: ['headlines', 'longHeadlines', 'descriptions'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    messages: [
      {
        role: 'user',
        content: `Write Google Demand Gen video ad copy.
Video title: "${videoTitle}"
Product category: ${productCategory || 'n/a'}
Product promoted: ${productPromoted || 'n/a'}

Generate exactly 15 headlines (max 30 chars), 5 long headlines (max 90 chars), and 5 descriptions (max 90 chars). Keep tone direct and benefit-led.`,
      },
    ],
  });

  const toolUse = message.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    return NextResponse.json({ error: 'No copy generated' }, { status: 502 });
  }

  const input = toolUse.input as { headlines: string[]; longHeadlines: string[]; descriptions: string[] };
  return NextResponse.json({
    headlines: input.headlines.map((h) => h.slice(0, 30)),
    longHeadlines: input.longHeadlines.map((h) => h.slice(0, 90)),
    descriptions: input.descriptions.map((d) => d.slice(0, 90)),
  });
}
