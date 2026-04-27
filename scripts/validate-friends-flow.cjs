#!/usr/bin/env node

const assert = require('node:assert/strict');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const PASSWORD = 'Password123!';

function log(step, msg) {
  process.stdout.write(`[${step}] ${msg}\n`);
}

function splitSetCookieHeader(headerValue) {
  if (!headerValue) return [];
  return headerValue.split(/,(?=[^;,]+=)/g);
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  addFromResponse(res) {
    let setCookies = [];
    if (typeof res.headers.getSetCookie === 'function') {
      setCookies = res.headers.getSetCookie();
    } else {
      setCookies = splitSetCookieHeader(res.headers.get('set-cookie'));
    }

    for (const raw of setCookies) {
      const first = raw.split(';', 1)[0] || '';
      const eq = first.indexOf('=');
      if (eq <= 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      if (!name) continue;
      this.cookies.set(name, value);
    }
  }

  header() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
}

async function requestJson(jar, path, init = {}) {
  const headers = { ...(init.headers || {}) };
  const cookie = jar?.header();
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (jar) jar.addFromResponse(res);

  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await res.json()
    : await res.text();

  return { res, body };
}

async function registerAccount(accountType, name, email) {
  const { res, body } = await requestJson(null, '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password: PASSWORD, accountType }),
  });

  assert.equal(res.status, 201, `register failed for ${email}: ${JSON.stringify(body)}`);
}

async function signIn(email) {
  const jar = new CookieJar();

  const csrf = await requestJson(jar, '/api/auth/csrf');
  assert.equal(csrf.res.status, 200, `csrf failed for ${email}`);
  assert.equal(typeof csrf.body?.csrfToken, 'string', `missing csrf token for ${email}`);

  const form = new URLSearchParams({
    csrfToken: csrf.body.csrfToken,
    email,
    password: PASSWORD,
    callbackUrl: `${BASE_URL}/`,
    json: 'true',
  });

  const signInRes = await requestJson(jar, '/api/auth/callback/credentials?json=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    redirect: 'manual',
  });

  assert.ok([200, 302].includes(signInRes.res.status), `signin status unexpected for ${email}: ${signInRes.res.status}`);

  const sessionRes = await requestJson(jar, '/api/friends');
  assert.equal(sessionRes.res.status, 200, `auth session check failed for ${email}`);
  assert.equal(sessionRes.body?.success, true, `friends check failed for ${email}`);

  return jar;
}

async function main() {
  const token = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const accountA = {
    name: `System Alpha ${token}`,
    email: `alpha.${token}@example.com`,
  };
  const accountB = {
    name: `Friend Beta ${token}`,
    email: `beta.${token}@example.com`,
  };

  log('1/9', 'Registering two real accounts');
  await registerAccount('system', accountA.name, accountA.email);
  await registerAccount('singlet', accountB.name, accountB.email);

  log('2/9', 'Signing in both accounts');
  const jarA = await signIn(accountA.email);
  const jarB = await signIn(accountB.email);

  log('3/9', 'Creating friend request A -> B');
  const invite = await requestJson(jarA, '/api/friends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: accountB.email, message: 'Vamos nos conectar com cuidado.' }),
  });
  assert.ok([200, 201].includes(invite.res.status), `invite failed: ${JSON.stringify(invite.body)}`);

  log('4/9', 'Accepting request as B');
  const bFriends = await requestJson(jarB, '/api/friends');
  assert.equal(bFriends.res.status, 200, 'B friends fetch failed');
  const incoming = bFriends.body?.data?.incomingRequests || [];
  assert.ok(incoming.length > 0, 'No incoming request found for B');

  const requestId = incoming[0].requestId;
  const accept = await requestJson(jarB, `/api/friends/requests/${requestId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'accept' }),
  });
  assert.equal(accept.res.status, 200, `accept failed: ${JSON.stringify(accept.body)}`);

  log('5/9', 'Checking friendship exists for A');
  const aFriendsAfterAccept = await requestJson(jarA, '/api/friends');
  const friends = aFriendsAfterAccept.body?.data?.friends || [];
  assert.ok(friends.length > 0, 'Friendship not found for A');
  const friendSystemId = friends[0].id;

  log('6/9', 'Creating one member and assigning sharing permission');
  const memberCreate = await requestJson(jarA, '/api/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `Shared Member ${token}` }),
  });
  assert.equal(memberCreate.res.status, 201, `member create failed: ${JSON.stringify(memberCreate.body)}`);
  const memberId = memberCreate.body?.data?.id;
  assert.ok(memberId, 'member id missing');

  const sharingSet = await requestJson(jarA, `/api/friends/sharing/${friendSystemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberId,
      visibility: 'profile',
      fieldVisibility: {
        pronouns: true,
        description: true,
        avatarUrl: true,
        color: true,
        role: true,
        tags: true,
        notes: false,
      },
    }),
  });
  assert.equal(sharingSet.res.status, 200, `sharing set failed: ${JSON.stringify(sharingSet.body)}`);

  const sharingGet = await requestJson(jarA, `/api/friends/sharing/${friendSystemId}`);
  assert.equal(sharingGet.res.status, 200, `sharing get failed: ${JSON.stringify(sharingGet.body)}`);
  const sharedEntry = (sharingGet.body?.data?.members || []).find((m) => m.id === memberId);
  assert.equal(sharedEntry?.visibility, 'profile', 'sharing visibility not persisted');
  assert.equal(sharedEntry?.fieldVisibility?.pronouns, true, 'pronouns field visibility not persisted');
  assert.equal(sharedEntry?.fieldVisibility?.notes, false, 'notes field visibility not persisted');

  log('7/9', 'Unfriending B from A');
  const unfriend = await requestJson(jarA, `/api/friends/${friendSystemId}`, {
    method: 'DELETE',
  });
  assert.equal(unfriend.res.status, 200, `unfriend failed: ${JSON.stringify(unfriend.body)}`);

  const aFriendsAfterUnfriend = await requestJson(jarA, '/api/friends');
  assert.equal((aFriendsAfterUnfriend.body?.data?.friends || []).length, 0, 'unfriend did not remove friendship');

  log('8/9', 'Blocking B from A and validating invite lock');
  const block = await requestJson(jarA, '/api/friends/blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockedSystemId: friendSystemId }),
  });
  assert.equal(block.res.status, 201, `block failed: ${JSON.stringify(block.body)}`);

  const inviteBlocked = await requestJson(jarA, '/api/friends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: accountB.email, message: 'test blocked' }),
  });
  assert.equal(inviteBlocked.res.status, 403, 'invite should be blocked while account is blocked');

  log('9/9', 'Unblocking B and confirming invite works again');
  const unblock = await requestJson(jarA, `/api/friends/blocks/${friendSystemId}`, {
    method: 'DELETE',
  });
  assert.equal(unblock.res.status, 200, `unblock failed: ${JSON.stringify(unblock.body)}`);

  const inviteAfterUnblock = await requestJson(jarA, '/api/friends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: accountB.email, message: 'reconnect after unblock' }),
  });
  assert.ok([200, 201].includes(inviteAfterUnblock.res.status), `invite after unblock failed: ${JSON.stringify(inviteAfterUnblock.body)}`);

  log('done', 'Friend flow validated with two real accounts.');
}

main().catch((error) => {
  console.error('[error]', error?.stack || error);
  process.exit(1);
});
