#!/usr/bin/env node
// Generate a VAPID key pair for Web Push and print the env vars to paste
// into .env.local (or your Vercel project settings).
//
// Usage: node scripts/generate-vapid-keys.cjs

const webPush = require('web-push');

const { publicKey, privateKey } = webPush.generateVAPIDKeys();

const subject = process.argv[2] || 'mailto:you@example.com';

const block = [
  `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=${publicKey}`,
  `WEB_PUSH_VAPID_PRIVATE_KEY=${privateKey}`,
  `WEB_PUSH_VAPID_SUBJECT=${subject}`,
].join('\n');

console.log('\nGenerated VAPID key pair. Add these to .env.local (locally)');
console.log('AND to your Vercel project Environment Variables (Production + Preview):\n');
console.log(block);
console.log('\nThe subject must be a mailto: URI for the user/team responsible');
console.log('for the application (push providers require this).');
console.log('\nIMPORTANT: changing the VAPID keys invalidates all existing push');
console.log('subscriptions — users will need to re-enable notifications.\n');
