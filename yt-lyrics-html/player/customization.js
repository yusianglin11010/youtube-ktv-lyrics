/**
 * YouTube KTV Lyrics - Customization Module
 * 負責客製化設定（字體、顏色、大小等）
 */

const Customization = (function() {
    'use strict';

    let colorUpdateTimeout = null;

    /**
     * 初始化設定
     */
    function init() {
        setupFontSelector();
        setupColorPicker();
        setupFontSizeSlider();
        setupSubtitleOffset();
        setupColorPresets();
        setupRoleColors();
    }

    /**
     * 設定字型選擇器
     */
    function setupFontSelector() {
        let fontSelector = document.getElementById("fontSelector");
        if (fontSelector) {
            fontSelector.addEventListener("change", function() {
                let selectedFont = this.value;
                document.getElementById("lyricsDisplay").style.fontFamily = selectedFont;
            });
        }
    }

    /**
     * 設定顏色選擇器
     */
    function setupColorPicker() {
        let highlightTextColor = document.getElementById("highlightTextColor");
        let highlightShadowColor = document.getElementById("highlightShadowColor");

        if (highlightTextColor) {
            highlightTextColor.addEventListener("input", debouncedUpdateHighlightColor);
        }
        if (highlightShadowColor) {
            highlightShadowColor.addEventListener("input", debouncedUpdateHighlightColor);
        }
    }

    /**
     * 延遲更新高亮顏色
     */
    function debouncedUpdateHighlightColor() {
        if (colorUpdateTimeout) {
            clearTimeout(colorUpdateTimeout);
        }
        colorUpdateTimeout = setTimeout(() => {
            updateHighlightColor();
        }, 300);
    }

    /**
     * 更新高亮顏色
     */
    function updateHighlightColor() {
        let highlightTextColor = document.getElementById("highlightTextColor").value;
        let highlightShadowColor = document.getElementById("highlightShadowColor").value;

        document.querySelectorAll(".highlight-text").forEach(text => {
            text.style.color = highlightTextColor;
            text.style.textShadow = `2px 2px 5px ${highlightShadowColor}`;
        });

        // 更新 main-text 元素的漸層（新動畫方式）
        document.querySelectorAll(".main-text, .pinyin-text").forEach(text => {
            text.style.background = AnimationUtils.createGradientStyle(highlightTextColor, 'white');
            text.style.backgroundSize = '200% 100%';
            text.style.webkitBackgroundClip = 'text';
            text.style.backgroundClip = 'text';
        });
    }

    /**
     * 設定字體大小滑桿
     */
    function setupFontSizeSlider() {
        let fontSizeSlider = document.getElementById("fontSizeSlider");
        if (fontSizeSlider) {
            fontSizeSlider.addEventListener("input", updateFontSize);
        }
    }

    /**
     * 更新字體大小
     */
    function updateFontSize() {
        let fontSizePercentage = document.getElementById("fontSizeSlider").value;
        PlayerState.currentFontSizePercentage = fontSizePercentage;
        document.getElementById("fontSizeValue").textContent = fontSizePercentage + "%";

        // 計算實際字體大小
        const container = document.getElementById('lyricsContainer') || document.getElementById('player-container');
        PlayerState.containerWidth = FontSizeCalculator.getContainerWidth(container);

        const actualFontSize = FontSizeCalculator.getSafeFontSize(
            fontSizePercentage,
            PlayerState.containerWidth,
            PlayerState.subtitleData
        );

        document.getElementById("lyricsDisplay").style.fontSize = actualFontSize + "px";
    }

    /**
     * 設定字幕時間偏移滑桿
     */
    function setupSubtitleOffset() {
        let subtitleOffset = document.getElementById("subtitleOffset");
        if (subtitleOffset) {
            subtitleOffset.addEventListener("input", function() {
                let newOffset = parseFloat(this.value);
                let delta = newOffset - PlayerState.currentOffset;

                let displayText = "";
                if (newOffset < 0) {
                    displayText = `調快 ${Math.abs(newOffset).toFixed(2)}s`;
                } else if (newOffset > 0) {
                    displayText = `調慢 ${Math.abs(newOffset).toFixed(2)}s`;
                } else {
                    displayText = "未微調";
                }

                document.getElementById("subtitleOffsetValue").textContent = displayText;

                PlayerState.subtitleData.forEach(entry => {
                    entry.startTime += delta;
                    entry.endTime += delta;
                });

                PlayerState.currentOffset = newOffset;

                if (PlayerState.player && PlayerState.player.getCurrentTime) {
                    AnimationEngine.updateDisplay(PlayerState.player.getCurrentTime());
                }
            });
        }
    }

    /**
     * 設定預設顏色按鈕
     */
    function setupColorPresets() {
        document.querySelectorAll('.color-preset-btn:not(.color-custom-btn)').forEach(btn => {
            btn.addEventListener('click', function() {
                const selectedColor = this.getAttribute('data-color');

                document.getElementById('highlightTextColor').value = selectedColor;

                document.querySelectorAll('.color-preset-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');

                updateHighlightColor();
            });
        });

        let customColorBtn = document.getElementById('customColorBtn');
        if (customColorBtn) {
            customColorBtn.addEventListener('click', function() {
                const colorPicker = document.getElementById('highlightTextColor');
                colorPicker.click();

                colorPicker.addEventListener('change', function() {
                    document.querySelectorAll('.color-preset-btn').forEach(b => b.classList.remove('selected'));
                    document.getElementById('customColorBtn').classList.add('selected');
                    updateHighlightColor();
                }, { once: true });
            });
        }

        // 頁面載入時標記預設選中的顏色按鈕
        window.addEventListener('load', function() {
            const currentColor = document.getElementById('highlightTextColor').value.toUpperCase();
            const matchingBtn = document.querySelector(`.color-preset-btn[data-color="${currentColor}"]`);

            if (matchingBtn) {
                matchingBtn.classList.add('selected');
            } else {
                let customBtn = document.getElementById('customColorBtn');
                if (customBtn) {
                    customBtn.classList.add('selected');
                }
            }
        });
    }

    /**
     * 設定角色顏色
     */
    function setupRoleColors() {
        let role1Color = document.getElementById('role1Color');
        let role2Color = document.getElementById('role2Color');
        let role3Color = document.getElementById('role3Color');

        if (role1Color) {
            role1Color.addEventListener('input', function() {
                PlayerState.roleColors['1'] = this.value;
            });
        }

        if (role2Color) {
            role2Color.addEventListener('input', function() {
                PlayerState.roleColors['2'] = this.value;
            });
        }

        if (role3Color) {
            role3Color.addEventListener('input', function() {
                PlayerState.roleColors['3'] = this.value;
            });
        }
    }

    /**
     * 取得當前設定
     */
    function getSettings() {
        return {
            fontSize: PlayerState.currentFontSize,
            highlightColor: document.getElementById('highlightTextColor').value,
            shadowColor: document.getElementById('highlightShadowColor').value,
            font: document.getElementById('fontSelector').value,
            roleColors: { ...PlayerState.roleColors },
            offset: PlayerState.currentOffset
        };
    }

    return {
        init,
        updateHighlightColor,
        updateFontSize,
        getSettings
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Customization;
}
