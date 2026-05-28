import { NextResponse } from 'next/server';

// Digital Asset Links manifest — links this web origin to one or more
// Android apps so a TWA (Trusted Web Activity) can launch fullscreen
// without the "running in Chrome" browser chrome.
//
// Required for any Android wrapper built via PWABuilder / Bubblewrap to
// function as a proper TWA. Without it, the user's APK falls back to a
// Chrome Custom Tab — which won't receive Web Push, won't show the OS
// notification banner, and can't request the POST_NOTIFICATIONS runtime
// permission.
//
// Served at the spec-required path /.well-known/assetlinks.json via the
// rewrite in next.config.mjs.
//
// Configure via env vars (one per app):
//   TWA_PACKAGE_NAME        = "com.solara.plural" (or whatever you chose)
//   TWA_SHA256_FINGERPRINTS = "AB:CD:..:EF" (comma-separated for multiple)
//
// You get the SHA-256 fingerprint from PWABuilder (it's shown after
// generating the package) or from `keytool -list -v -keystore your.keystore`.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Statement = {
  relation: string[];
  target: {
    namespace: string;
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
};

export function GET() {
  const packageName = process.env.TWA_PACKAGE_NAME?.trim();
  const fingerprintsRaw = process.env.TWA_SHA256_FINGERPRINTS?.trim();

  if (!packageName || !fingerprintsRaw) {
    // Empty array is valid — Chrome simply won't trust any APK. Friendlier
    // for monitoring than a 404.
    return NextResponse.json([], {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  }

  const fingerprints = fingerprintsRaw
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  const statements: Statement[] = [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: packageName,
      sha256_cert_fingerprints: fingerprints,
    },
  }];

  return NextResponse.json(statements, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/json',
    },
  });
}
