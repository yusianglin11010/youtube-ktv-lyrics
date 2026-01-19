#!/usr/bin/env node

/**
 * Sync shared library files from yt-lyrics-html to yt-lyrics-extension
 *
 * This script ensures that common libraries are kept in sync between
 * the standalone HTML version and the Chrome extension.
 *
 * Usage: node sync-libs.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Shared library files that need to be synced
const SHARED_LIBS = [
  'subtitle-parser.js',
  'constants.js',
  'animation-utils.js',
  'font-size-calculator.js'
];

const SOURCE_DIR = path.join(__dirname, 'yt-lyrics-html', 'lib');
const TARGET_DIR = path.join(__dirname, 'yt-lyrics-extension', 'lib');

// Auto-sync comment to add at the top of synced files
const SYNC_COMMENT = '// ⚠️ AUTO-SYNCED from yt-lyrics-html/lib - DO NOT EDIT DIRECTLY\n// To modify this file, edit yt-lyrics-html/lib/${filename} and run: npm run sync-libs\n\n';

/**
 * Calculate MD5 hash of a file
 */
function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Check if file content differs (excluding the auto-sync comment)
 */
function filesAreDifferent(sourceFile, targetFile) {
  if (!fs.existsSync(targetFile)) {
    return true;
  }

  const sourceContent = fs.readFileSync(sourceFile, 'utf8');
  const targetContent = fs.readFileSync(targetFile, 'utf8');

  // Remove the auto-sync comment from target for comparison
  const targetContentClean = targetContent.replace(
    /^\/\/ ⚠️ AUTO-SYNCED.*?\n\/\/ To modify.*?\n\n/s,
    ''
  );

  return sourceContent !== targetContentClean;
}

/**
 * Sync a single file from source to target
 */
function syncFile(filename) {
  const sourcePath = path.join(SOURCE_DIR, filename);
  const targetPath = path.join(TARGET_DIR, filename);

  // Check if source file exists
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Source file not found: ${sourcePath}`);
    return false;
  }

  // Check if files are already in sync
  if (!filesAreDifferent(sourcePath, targetPath)) {
    console.log(`⏭️  ${filename} - already in sync`);
    return true;
  }

  try {
    // Read source content
    const sourceContent = fs.readFileSync(sourcePath, 'utf8');

    // Add auto-sync comment
    const comment = SYNC_COMMENT.replace('${filename}', filename);
    const targetContent = comment + sourceContent;

    // Ensure target directory exists
    if (!fs.existsSync(TARGET_DIR)) {
      fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    // Write to target
    fs.writeFileSync(targetPath, targetContent, 'utf8');

    console.log(`✅ ${filename} - synced successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to sync ${filename}:`, error.message);
    return false;
  }
}

/**
 * Main sync process
 */
function main() {
  console.log('🔄 Starting library sync...\n');
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Target: ${TARGET_DIR}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const filename of SHARED_LIBS) {
    const success = syncFile(filename);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Sync completed: ${successCount} synced, ${errorCount} errors`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

// Run the script
main();
