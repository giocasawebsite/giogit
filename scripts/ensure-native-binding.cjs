/**
 * GioCasa Arena - Native Binding Resolver for Render (Linux x64)
 * Ensures @rolldown/binding-linux-x64-gnu (or musl) is installed and available
 * even if npm skipped optional dependencies or if Node.js is < 20.19.0.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function isMusl() {
  if (process.platform !== 'linux') return false;
  try {
    return fs.readFileSync('/usr/bin/ldd', 'utf-8').includes('musl');
  } catch {
    return false;
  }
}

function ensureNativeBinding() {
  // Only execute on Linux x64 platforms (e.g., Render, Docker, Linux CI/CD)
  if (process.platform !== 'linux' || process.arch !== 'x64') {
    return;
  }

  const musl = isMusl();
  const pkgName = musl ? '@rolldown/binding-linux-x64-musl' : '@rolldown/binding-linux-x64-gnu';
  const pkgVersion = '1.2.4';
  const binaryFileName = musl ? 'rolldown-binding.linux-x64-musl.node' : 'rolldown-binding.linux-x64-gnu.node';
  const projectRoot = path.resolve(__dirname, '..');
  const targetDir = path.join(projectRoot, 'node_modules', pkgName);
  const targetBinary = path.join(targetDir, binaryFileName);

  if (fs.existsSync(targetBinary)) {
    console.log(`[native-binding] Verified: ${pkgName} is present at ${targetBinary}`);
    return;
  }

  console.log(`[native-binding] Missing native binding for ${pkgName}. Resolving for Render Linux environment...`);

  // Attempt 1: Direct npm install --no-save with engine check disabled
  try {
    execSync(`npm install --no-save --engine-strict=false ${pkgName}@${pkgVersion}`, {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    if (fs.existsSync(targetBinary)) {
      console.log(`[native-binding] Successfully installed ${pkgName}@${pkgVersion} via npm.`);
      return;
    }
  } catch (err) {
    console.warn(`[native-binding] npm install attempt failed: ${err.message}. Trying direct registry download...`);
  }

  // Attempt 2: Direct tarball extraction fallback
  try {
    const tarballName = `${pkgName.replace('@rolldown/', '')}-${pkgVersion}.tgz`;
    const tarballUrl = `https://registry.npmjs.org/${pkgName}/-/${tarballName}`;
    fs.mkdirSync(targetDir, { recursive: true });
    execSync(`curl -sL "${tarballUrl}" | tar -xz -C "${targetDir}" --strip-components=1`, {
      stdio: 'inherit',
      cwd: projectRoot,
    });
    if (fs.existsSync(targetBinary)) {
      console.log(`[native-binding] Successfully extracted ${pkgName} from registry tarball.`);
      return;
    }
  } catch (err) {
    console.error(`[native-binding] Direct tarball download failed: ${err.message}`);
  }

  if (!fs.existsSync(targetBinary)) {
    console.error(`[native-binding] CRITICAL: Failed to locate ${binaryFileName} after resolution attempts.`);
    process.exit(1);
  }
}

try {
  ensureNativeBinding();
} catch (e) {
  console.error('[native-binding] Unexpected error during native binding resolution:', e);
}
