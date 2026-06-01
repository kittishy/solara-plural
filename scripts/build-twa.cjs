#!/usr/bin/env node
/* eslint-disable no-console */
// Programmatic TWA builder using @bubblewrap/core directly.
// Skips bubblewrap CLI's interactive prompts; all settings are set here.
//
// Outputs:
//   build/twa/app-release-signed.apk   — installable APK
//   build/twa/android.keystore         — signing keystore (KEEP SAFE)
//   build/twa/keystore-info.txt        — passwords + SHA-256 fingerprint
//
// Required env vars when invoking:
//   JAVA_HOME, ANDROID_HOME

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const corePath = path.join(
  os.homedir(),
  'AppData',
  'Roaming',
  'npm',
  'node_modules',
  '@bubblewrap',
  'cli',
  'node_modules',
  '@bubblewrap',
  'core',
);

const {
  Config,
  JdkHelper,
  AndroidSdkTools,
  TwaManifest,
  TwaGenerator,
  KeyTool,
  GradleWrapper,
  JarSigner,
  ConsoleLog,
} = require(corePath);

const WORK_DIR = path.resolve(__dirname, '..', 'build', 'twa');
// The keystore lives OUTSIDE WORK_DIR (which is wiped on every build) so the
// signing identity — and therefore the SHA-256 fingerprint in assetlinks and
// the ability to ship app updates over an existing install — stays stable
// across rebuilds. Losing this keystore/password means a new fingerprint and
// users having to uninstall+reinstall, so it's persisted and gitignored.
const KEYSTORE_DIR = path.resolve(__dirname, '..', 'build', 'twa-keystore');
const KEYSTORE_PATH = path.join(KEYSTORE_DIR, 'android.keystore');
const PASSWORD_FILE = path.join(KEYSTORE_DIR, 'password.txt');
const MANIFEST_URL = 'https://solara-plural.vercel.app/manifest.json';
const PACKAGE_ID = 'com.solara.plural';
const APP_NAME = 'Solara';
const HOST = 'solara-plural.vercel.app';
const KEY_ALIAS = 'android';

// Durable keystore password resolution, in priority order:
//   1. TWA_KEYSTORE_PASSWORD env var (you control it, survives anything)
//   2. build/twa-keystore/password.txt (persisted from a previous build)
//   3. freshly generated, then persisted to password.txt
// This is what was missing before: the old password lived only in a
// keystore-info.txt that got deleted, orphaning the keystore.
fs.mkdirSync(KEYSTORE_DIR, { recursive: true });
const KEY_PASSWORD = (() => {
  const fromEnv = process.env.TWA_KEYSTORE_PASSWORD && process.env.TWA_KEYSTORE_PASSWORD.trim();
  if (fromEnv) return fromEnv;
  if (fs.existsSync(PASSWORD_FILE)) {
    const saved = fs.readFileSync(PASSWORD_FILE, 'utf8').trim();
    if (saved) return saved;
  }
  const generated = 'solara-' + crypto.randomBytes(12).toString('hex');
  fs.writeFileSync(PASSWORD_FILE, generated, 'utf8');
  return generated;
})();
const KEY_FULL_NAME = 'Solara Plural';
const KEY_ORG = 'Solara';
const KEY_ORG_UNIT = 'Dev';
const KEY_COUNTRY = 'BR';

async function main() {
  const log = new ConsoleLog('build-twa');

  fs.rmSync(WORK_DIR, { recursive: true, force: true });
  fs.mkdirSync(WORK_DIR, { recursive: true });

  if (!process.env.JAVA_HOME || !process.env.ANDROID_HOME) {
    throw new Error('Set JAVA_HOME and ANDROID_HOME before running.');
  }

  // Ensure JDK and Android SDK bins are on PATH for all child processes.
  const pathSep = process.platform === 'win32' ? ';' : ':';
  const newPathEntries = [
    path.join(process.env.JAVA_HOME, 'bin'),
    path.join(process.env.ANDROID_HOME, 'platform-tools'),
    path.join(process.env.ANDROID_HOME, 'cmdline-tools', 'latest', 'bin'),
  ];
  process.env.Path = newPathEntries.join(pathSep) + pathSep + (process.env.Path || process.env.PATH || '');
  process.env.PATH = process.env.Path;
  console.log('[setup] PATH primed with', newPathEntries);

  const config = new Config(process.env.JAVA_HOME, process.env.ANDROID_HOME);
  const jdkHelper = new JdkHelper(process, config);
  const androidSdkTools = await AndroidSdkTools.create(process, config, jdkHelper, log);

  log.info('Loading web manifest...');
  let twaManifest = await TwaManifest.fromWebManifest(MANIFEST_URL);

  // Override defaults
  twaManifest.packageId = PACKAGE_ID;
  twaManifest.name = APP_NAME;
  twaManifest.launcherName = APP_NAME;
  twaManifest.host = HOST;
  twaManifest.signingKey = {
    path: KEYSTORE_PATH,
    alias: KEY_ALIAS,
  };
  // Ensure absolute URL
  twaManifest.webManifestUrl = new URL(MANIFEST_URL);
  twaManifest.startUrl = '/';
  twaManifest.iconUrl = `https://${HOST}/icons/icon-512.png`;
  twaManifest.maskableIconUrl = `https://${HOST}/icons/maskable-512.png`;
  twaManifest.appVersionName = '1.0.0';
  twaManifest.appVersionCode = 1;
  twaManifest.themeColor = twaManifest.themeColor || { hex: () => '#09070f' };
  twaManifest.backgroundColor = twaManifest.backgroundColor || { hex: () => '#09070f' };

  // Save twa-manifest.json
  await twaManifest.saveToFile(path.join(WORK_DIR, 'twa-manifest.json'));
  log.info('Wrote twa-manifest.json');

  log.info('Generating TWA project...');
  const twaGenerator = new TwaGenerator();
  await twaGenerator.createTwaProject(WORK_DIR, twaManifest, log);

  const keyTool = new KeyTool(jdkHelper, log);
  if (fs.existsSync(KEYSTORE_PATH)) {
    log.info('Reusing existing keystore (stable signing identity): ' + KEYSTORE_PATH);
  } else {
    log.info('Generating signing key...');
    await keyTool.createSigningKey({
      path: twaManifest.signingKey.path,
      alias: twaManifest.signingKey.alias,
      fullName: KEY_FULL_NAME,
      organization: KEY_ORG,
      organizationalUnit: KEY_ORG_UNIT,
      country: KEY_COUNTRY,
      password: KEY_PASSWORD,
      keypassword: KEY_PASSWORD,
    });
    log.info('Created keystore');
  }

  log.info('Running gradle assembleRelease (may take 5-15 min on first run)...');
  // GradleWrapper invokes `gradlew.bat` without `.\` on Windows which fails
  // ("not recognized as ... command"). Run gradle ourselves with cwd set.
  await new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const env = { ...process.env, ...androidSdkTools.getEnv() };
    // Use absolute path — cmd.exe doesn't search cwd for the executable.
    const gradlewPath = path.join(WORK_DIR, 'gradlew.bat');
    const gradle = spawn(gradlewPath, ['assembleRelease', '--stacktrace'], {
      cwd: WORK_DIR,
      env,
      stdio: 'inherit',
      shell: true,
    });
    gradle.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('Gradle exited with code ' + code));
    });
    gradle.on('error', reject);
  });

  const unsignedApk = path.join(WORK_DIR, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk');
  const alignedApk = path.join(WORK_DIR, 'app-release-aligned.apk');
  const signedApk = path.join(WORK_DIR, 'app-release-signed.apk');

  // Sign with zipalign + apksigner (APK Signature Scheme v2/v3).
  //
  // bubblewrap's JarSigner only does the legacy v1 (JAR) scheme. Android's
  // targetSdk 35 REQUIRES v2+, so a v1-only APK fails to install with
  // "requires a minimum of signature scheme v2". We use the build-tools
  // zipalign + apksigner instead, which produce a v1+v2+v3 signed APK.
  const { execFileSync } = require('child_process');
  const buildToolsDir = (() => {
    const root = path.join(process.env.ANDROID_HOME, 'build-tools');
    const versions = fs.readdirSync(root).filter((v) => /^\d+\./.test(v)).sort();
    if (versions.length === 0) throw new Error('No Android build-tools found');
    return path.join(root, versions[versions.length - 1]);
  })();
  const zipalign = path.join(buildToolsDir, 'zipalign.exe');
  const apksigner = path.join(buildToolsDir, 'apksigner.bat');

  log.info('Zipaligning APK...');
  execFileSync(zipalign, ['-f', '-p', '4', unsignedApk, alignedApk], { stdio: 'inherit' });

  log.info('Signing APK (v1+v2+v3)...');
  execFileSync(apksigner, [
    'sign',
    '--ks', twaManifest.signingKey.path,
    '--ks-key-alias', twaManifest.signingKey.alias,
    '--ks-pass', 'pass:' + KEY_PASSWORD,
    '--key-pass', 'pass:' + KEY_PASSWORD,
    '--v1-signing-enabled', 'true',
    '--v2-signing-enabled', 'true',
    '--v3-signing-enabled', 'true',
    '--out', signedApk,
    alignedApk,
  ], { stdio: 'inherit' });

  log.info('Verifying APK signature...');
  execFileSync(apksigner, ['verify', signedApk], { stdio: 'inherit' });

  // Extract SHA-256 fingerprint directly via keytool. (bubblewrap's
  // KeyTool.list crashes on some JDK/locale combos — "Cannot read properties
  // of undefined (reading 'replace')" — so we don't rely on it.)
  log.info('Extracting SHA-256 fingerprint...');
  const sha256 = (() => {
    try {
      const { execFileSync } = require('child_process');
      const keytoolPath = path.join(process.env.JAVA_HOME, 'bin', 'keytool');
      const out = execFileSync(keytoolPath, [
        '-list', '-v',
        '-keystore', twaManifest.signingKey.path,
        '-alias', twaManifest.signingKey.alias,
        '-storepass', KEY_PASSWORD,
        '-keypass', KEY_PASSWORD,
      ], { encoding: 'utf8' });
      const match = /SHA-?256:\s*([0-9A-Fa-f:]+)/.exec(out);
      return match ? match[1].trim().toUpperCase() : 'UNKNOWN';
    } catch (e) {
      console.error('[fingerprint] keytool failed:', e.message);
      return 'UNKNOWN';
    }
  })();

  const info = [
    'Solara Plural TWA — generated ' + new Date().toISOString(),
    '',
    'PackageId:        ' + PACKAGE_ID,
    'App name:         ' + APP_NAME,
    'Host:             ' + HOST,
    'Keystore path:    ' + twaManifest.signingKey.path,
    'Key alias:        ' + KEY_ALIAS,
    'Key password:     ' + KEY_PASSWORD,
    'Keystore password:' + KEY_PASSWORD,
    'SHA-256 (set as TWA_SHA256_FINGERPRINTS on Vercel):',
    '  ' + sha256,
    '',
    'Signed APK:       ' + signedApk,
  ].join('\n');

  fs.writeFileSync(path.join(WORK_DIR, 'keystore-info.txt'), info, 'utf8');
  console.log('\n========================================');
  console.log(info);
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('BUILD FAILED:', err);
  process.exit(1);
});
