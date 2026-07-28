import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'public/service-worker.js'), 'utf8');

describe('service worker privacy and offline policy', () => {
  it('bypasses authenticated Next.js Flight payloads', () => {
    expect(source).toContain("url.searchParams.has('_rsc')");
    expect(source).toContain("request.headers.get('rsc') === '1'");
    expect(source).toContain("request.headers.has('next-router-prefetch')");
    expect(source).toContain('if (isNextFlightRequest(request, url)) return;');
  });

  it('does not have a generic runtime cache for unclassified responses', () => {
    expect(source).not.toContain('RUNTIME_CACHE');
    expect(source).not.toContain('API_CACHE');
  });

  it('uses only the public offline shell as navigation fallback', () => {
    expect(source).toContain("'/offline.html'");
    expect(source).toContain("caches.match('/offline.html')");
    expect(
      readFileSync(resolve(process.cwd(), 'public/offline.html'), 'utf8')
    ).toContain('Seus dados privados não ficam salvos nesta tela.');
  });
});
