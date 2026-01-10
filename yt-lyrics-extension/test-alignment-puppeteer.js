/**
 * 使用 Puppeteer 測試高亮對齊
 * 截圖並檢測兩層文字是否對齊
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testAlignment() {
    console.log('啟動瀏覽器...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    // 載入測試頁面
    const testPagePath = `file://${path.join(__dirname, 'test-full.html')}`;
    console.log(`載入頁面: ${testPagePath}`);
    await page.goto(testPagePath);
    await page.waitForSelector('#yt-ktv-lyrics-display');

    // 等待渲染
    await new Promise(r => setTimeout(r, 500));

    // 截圖初始狀態
    await page.screenshot({ path: '/tmp/alignment-test-0.png', fullPage: true });
    console.log('截圖 1: 初始狀態 -> /tmp/alignment-test-0.png');

    // 設定時間到 2.0 秒（第一行高亮中）
    await page.evaluate(() => {
        document.getElementById('time-slider').value = 2.0;
        document.getElementById('time-slider').dispatchEvent(new Event('input'));
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: '/tmp/alignment-test-1.png', fullPage: true });
    console.log('截圖 2: 時間 2.0s -> /tmp/alignment-test-1.png');

    // 設定時間到 7.0 秒（第二行英文）
    await page.evaluate(() => {
        document.getElementById('time-slider').value = 7.0;
        document.getElementById('time-slider').dispatchEvent(new Event('input'));
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: '/tmp/alignment-test-2.png', fullPage: true });
    console.log('截圖 3: 時間 7.0s -> /tmp/alignment-test-2.png');

    // 檢測對齊：獲取兩層的位置資訊
    const alignmentData = await page.evaluate(() => {
        const results = [];
        const words = document.querySelectorAll('.yt-ktv-word');

        words.forEach((word, index) => {
            const stacked = word.querySelector('.yt-ktv-stacked');
            const highlight = word.querySelector('.yt-ktv-highlight-wrapper');

            if (stacked && highlight) {
                const stackedRect = stacked.getBoundingClientRect();
                const highlightRect = highlight.getBoundingClientRect();

                const baseText = stacked.querySelector('.yt-ktv-base-text');
                const highlightText = highlight.querySelector('.yt-ktv-highlight-text');

                let baseTextRect = null, highlightTextRect = null;
                if (baseText && highlightText) {
                    baseTextRect = baseText.getBoundingClientRect();
                    highlightTextRect = highlightText.getBoundingClientRect();
                }

                results.push({
                    wordIndex: index,
                    word: baseText ? baseText.textContent : 'N/A',
                    stacked: {
                        left: stackedRect.left,
                        top: stackedRect.top,
                        width: stackedRect.width,
                        height: stackedRect.height
                    },
                    highlight: {
                        left: highlightRect.left,
                        top: highlightRect.top,
                        width: highlightRect.width,
                        height: highlightRect.height
                    },
                    baseText: baseTextRect ? {
                        left: baseTextRect.left,
                        top: baseTextRect.top
                    } : null,
                    highlightText: highlightTextRect ? {
                        left: highlightTextRect.left,
                        top: highlightTextRect.top
                    } : null,
                    isAligned: {
                        container: Math.abs(stackedRect.left - highlightRect.left) < 1 &&
                                   Math.abs(stackedRect.top - highlightRect.top) < 1,
                        text: baseTextRect && highlightTextRect ?
                              Math.abs(baseTextRect.left - highlightTextRect.left) < 1 &&
                              Math.abs(baseTextRect.top - highlightTextRect.top) < 1 : false
                    }
                });
            }
        });

        return results;
    });

    console.log('\n========== 對齊檢測結果 ==========');
    let allAligned = true;
    alignmentData.forEach(data => {
        const containerStatus = data.isAligned.container ? '✓' : '✗';
        const textStatus = data.isAligned.text ? '✓' : '✗';
        console.log(`字: "${data.word}"`);
        console.log(`  容器對齊: ${containerStatus} (stacked: ${data.stacked.left.toFixed(1)}, ${data.stacked.top.toFixed(1)} | highlight: ${data.highlight.left.toFixed(1)}, ${data.highlight.top.toFixed(1)})`);
        if (data.baseText && data.highlightText) {
            console.log(`  文字對齊: ${textStatus} (base: ${data.baseText.left.toFixed(1)}, ${data.baseText.top.toFixed(1)} | highlight: ${data.highlightText.left.toFixed(1)}, ${data.highlightText.top.toFixed(1)})`);
        }

        if (!data.isAligned.container || !data.isAligned.text) {
            allAligned = false;
        }
    });

    console.log('\n========== 總結 ==========');
    if (allAligned) {
        console.log('✓ 所有元素對齊正確！');
    } else {
        console.log('✗ 發現對齊問題，需要修正');
    }

    await browser.close();
    return allAligned;
}

testAlignment()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(err => {
        console.error('測試失敗:', err);
        process.exit(1);
    });
