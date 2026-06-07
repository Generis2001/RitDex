// app/api/rpc/route.ts
import { NextRequest, NextResponse } from 'next/server';

const RPC_URL = process.env.RITUAL_RPC_URL ?? 'https://rpc.ritualfoundation.org';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const resp = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const data = await resp.text();
  return new NextResponse(data, {
    headers: { 'Content-Type': 'application/json' },
  });
}
