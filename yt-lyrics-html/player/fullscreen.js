/**
 * YouTube KTV Lyrics - Fullscreen Module
 * 負責全螢幕功能與遮罩控制
 */

const Fullscreen = (function() {
    'use strict';

    let isMaskVisible = false;
    let isMaskPersistent = 0;
    let maskBtnTimeout = null;
    let hideMaskTimeout = null;
    let hideFullscreenTimeout = null;

    /**
     * 初始化全螢幕功能
     */
    function init() {
        setupFullscreenButton();
        setupMaskButton();
        setupFullscreenChangeListener();
        setupMaskHoverBehavior();
    }

    /**
     * 設定全螢幕按鈕
     */
    function setupFullscreenButton() {
        let fullscreenBtn = document.getElementById("customFullscreenBtn");
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener("click", toggleFullscreen);

            fullscreenBtn.addEventListener("mouseenter", function() {
                fullscreenBtn.classList.remove("hide-fullscreen-btn");
                clearTimeout(hideFullscreenTimeout);
            });

            fullscreenBtn.addEventListener("mouseleave", function() {
                if (document.fullscreenElement) {
                    hideFullscreenTimeout = setTimeout(() => {
                        fullscreenBtn.classList.add("hide-fullscreen-btn");
                    }, 3000);
                }
            });
        }
    }

    /**
     * 設定遮罩按鈕
     */
    function setupMaskButton() {
        let maskBtn = document.getElementById("toggleMaskBtn");
        if (maskBtn) {
            maskBtn.addEventListener("click", toggleMask);

            maskBtn.addEventListener("mouseenter", function() {
                maskBtn.classList.remove("hidden-btn");
                clearTimeout(maskBtnTimeout);
            });

            maskBtn.addEventListener("mouseleave", function() {
                if (document.fullscreenElement) {
                    maskBtnTimeout = setTimeout(() => {
                        maskBtn.classList.add("hidden-btn");
                    }, 3000);
                }
            });
        }
    }

    /**
     * 監聽全螢幕變化
     */
    function setupFullscreenChangeListener() {
        document.addEventListener("fullscreenchange", function() {
            let fullscreenBtn = document.getElementById("customFullscreenBtn");
            let maskBtn = document.getElementById("toggleMaskBtn");
            let videoMask = document.getElementById("videoMask");

            if (document.fullscreenElement) {
                if (maskBtn) maskBtn.classList.remove("hidden");

                // 恢復遮罩狀態
                if (isMaskPersistent === 1 && videoMask) {
                    videoMask.classList.remove("hidden");
                    if (maskBtn) maskBtn.textContent = "關閉遮罩";
                    isMaskVisible = true;
                }
            } else {
                // 退出全螢幕
                if (maskBtn) maskBtn.classList.add("hidden");
                if (videoMask) videoMask.classList.add("hidden");
                isMaskVisible = false;
                if (maskBtn) maskBtn.textContent = "開啟遮罩";

                document.body.classList.remove("fullscreen");
                if (fullscreenBtn) {
                    fullscreenBtn.textContent = "全螢幕播放";
                    fullscreenBtn.classList.remove("hide-fullscreen-btn");
                }
                clearTimeout(hideFullscreenTimeout);
            }
        });
    }

    /**
     * 設定遮罩 hover 行為
     */
    function setupMaskHoverBehavior() {
        let ytPlayerContainer = document.getElementById("player-container");
        let videoMask = document.getElementById("videoMask");

        if (ytPlayerContainer && videoMask) {
            ytPlayerContainer.addEventListener("mousemove", function(event) {
                if (isMaskVisible) {
                    let playerRect = ytPlayerContainer.getBoundingClientRect();
                    let cursorY = event.clientY;

                    if (cursorY > playerRect.bottom - 60) {
                        videoMask.style.opacity = "0";
                        videoMask.style.transition = "opacity 0.3s ease-in-out";
                        clearTimeout(hideMaskTimeout);
                    } else {
                        hideMaskTimeout = setTimeout(() => {
                            if (isMaskVisible) {
                                videoMask.style.opacity = "1";
                                videoMask.style.transition = "opacity 0.5s ease-in-out";
                            }
                        }, 1500);
                    }
                }
            });
        }
    }

    /**
     * 切換全螢幕
     */
    function toggleFullscreen() {
        let fullscreenBtn = document.getElementById("customFullscreenBtn");
        let maskBtn = document.getElementById("toggleMaskBtn");

        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                document.body.classList.add("fullscreen");
                if (fullscreenBtn) fullscreenBtn.textContent = "退出全螢幕";

                hideFullscreenTimeout = setTimeout(() => {
                    if (fullscreenBtn) fullscreenBtn.classList.add("hide-fullscreen-btn");
                }, 3000);

                maskBtnTimeout = setTimeout(() => {
                    if (maskBtn) maskBtn.classList.add("hidden-btn");
                }, 3000);
            }).catch(err => {
                console.error("🔴 無法進入全螢幕模式:", err);
            });
        } else {
            document.exitFullscreen().then(() => {
                document.body.classList.remove("fullscreen");
                if (fullscreenBtn) {
                    fullscreenBtn.textContent = "全螢幕播放";
                    fullscreenBtn.classList.remove("hide-fullscreen-btn");
                }
                clearTimeout(hideFullscreenTimeout);
            }).catch(err => {
                console.error("🔴 無法退出全螢幕模式:", err);
            });
        }
    }

    /**
     * 切換遮罩
     */
    function toggleMask() {
        let maskBtn = document.getElementById("toggleMaskBtn");
        let videoMask = document.getElementById("videoMask");

        isMaskVisible = !isMaskVisible;

        if (isMaskVisible) {
            if (videoMask) videoMask.classList.remove("hidden");
            if (maskBtn) maskBtn.textContent = "關閉遮罩";
            isMaskPersistent = 1;
        } else {
            if (videoMask) videoMask.classList.add("hidden");
            if (maskBtn) maskBtn.textContent = "開啟遮罩";
            isMaskPersistent = 0;
        }
    }

    /**
     * 檢查是否為全螢幕
     */
    function isFullscreen() {
        return !!document.fullscreenElement;
    }

    /**
     * 檢查遮罩是否可見
     */
    function isMaskActive() {
        return isMaskVisible;
    }

    return {
        init,
        toggleFullscreen,
        toggleMask,
        isFullscreen,
        isMaskActive
    };
})();

// 支援 Node.js 環境（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Fullscreen;
}
