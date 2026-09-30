import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePlayUrl, isLoopbackUrl } from '../src/lib/playUrl.js';

test('QR fallback encodes the hosted game route as a complete URL', () => {
  assert.equal(resolvePlayUrl('', 'https://botblitz.vercel.app'), 'https://botblitz.vercel.app/play');
});
test('QR normalizes a pasted domain and directs leaderboard links to play', () => {
  assert.equal(resolvePlayUrl(' botblitz.vercel.app ', 'http://localhost:5173'), 'https://botblitz.vercel.app/play');
  assert.equal(resolvePlayUrl('https://botblitz.vercel.app/leaderboard?mode=today#top', 'http://localhost:5173'), 'https://botblitz.vercel.app/play');
});
test('QR rejects arbitrary text, invalid protocols and embedded credentials', () => {
  for (const input of ['BOT BLITZ', 'javascript:alert(1)', 'https://name:password@botblitz.vercel.app']) {
    assert.equal(resolvePlayUrl(input, 'https://botblitz.vercel.app'), 'https://botblitz.vercel.app/play');
  }
});
test('localhost destinations are identified so phones are not offered unusable QR codes', () => {
  for (const url of ['http://localhost:5173/play', 'http://127.0.0.1:5173/play', 'http://[::1]/play']) assert.equal(isLoopbackUrl(url), true);
  assert.equal(isLoopbackUrl('https://botblitz.vercel.app/play'), false);
});
