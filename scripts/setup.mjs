#!/usr/bin/env node
// One-time setup for a fresh clone: checks the Node.js version, installs the
// dependencies for the repository and the app, and says how to start the app.
// Run it from the repository root with `npm run setup`. It uses only Node's
// standard library, so it works before anything is installed.

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [major, minor] = process.versions.node.split('.').map(Number);

const installNode24 = `
  macOS (Homebrew): brew install node@24
                    then add this line to ~/.zshrc and open a new terminal:
                    export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
  nvm or fnm:       nvm use   (or fnm use) in this folder
  Windows:          install nvm-windows, then nvm install 24 and nvm use 24`;

// React Native 0.88 supports ^22.13, ^24.3, and >=26. CI and the docs use 24.
const supported =
  (major === 22 && minor >= 13) || (major === 24 && minor >= 3) || major >= 26;

if (major < 22) {
  console.error(`Encore needs Node.js 24, but this is Node ${process.versions.node}.${installNode24}`);
  process.exit(1);
}
if (!supported) {
  console.warn(
    `Warning: Node ${process.versions.node} isn't officially supported by React Native. ` +
      `It usually works, but if anything breaks, switch to Node 24 (what CI uses):${installNode24}\n`,
  );
}

for (const [label, dir] of [
  ['repository tools (Jest, Supabase CLI)', root],
  ['the app', join(root, 'app')],
]) {
  console.log(`\n> Installing ${label}...`);
  // Windows runs npm through npm.cmd, which needs a shell.
  const result = spawnSync('npm', ['install'], { cwd: dir, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`\nnpm install failed in ${dir}. Fix the error above, then run npm run setup again.`);
    process.exit(result.status ?? 1);
  }
}

console.log(`
Setup finished. To run the app:

  npm start          from the repository root (works on any network, including eduroam)
  npm run start:lan  faster reloads when your phone and laptop are on the same home Wi-Fi

Then open it with Expo Go (install it from the App Store or Google Play):
  iPhone:   scan the QR code with the Camera app and tap "Open in Expo Go"
  Android:  open Expo Go and scan the QR code from there

Sign up with your own username; the whole team shares one development database.
More help: docs/setup.md`);
