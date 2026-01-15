#!/bin/bash

# YouTube KTV Lyrics - Build Script
# 用於同步共用模組到 extension

echo "Syncing shared modules to yt-lyrics-extension..."

# 來源目錄
SRC_DIR="yt-lyrics-html/lib"
# 目標目錄
DEST_DIR="yt-lyrics-extension/lib"

# 要同步的共用模組
SHARED_MODULES=(
    "subtitle-parser.js"
    "constants.js"
    "animation-utils.js"
)

# 同步檔案
for module in "${SHARED_MODULES[@]}"; do
    if [ -f "$SRC_DIR/$module" ]; then
        cp "$SRC_DIR/$module" "$DEST_DIR/$module"
        echo "  Copied: $module"
    else
        echo "  Warning: $SRC_DIR/$module not found"
    fi
done

echo "Done!"
echo ""
echo "Run tests to verify:"
echo "  cd yt-lyrics-html && npm test"
echo "  cd yt-lyrics-extension && npm test"
