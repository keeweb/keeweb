const MobileRegex = /iPhone|iPad|iPod|Android|BlackBerry|Opera Mini|IEMobile|WPDesktop|Windows Phone|webOS/i;
const MinDesktopScreenWidth = 800;

const isDesktop = !!(window.process && window.process.versions && window.process.versions.electron);

const Features = {
    isDesktop,
    isMac: navigator.platform.indexOf('Mac') >= 0,
    isWindows: navigator.platform.indexOf('Win') >= 0,
    isiOS: /iPad|iPhone|iPod/i.test(navigator.userAgent),
    isMobile: MobileRegex.test(navigator.userAgent) || screen.width < MinDesktopScreenWidth,
    isPopup: !!(window.parent !== window.top || window.opener),
    isStandalone: !!navigator.standalone,
    isFrame: window.top !== window,
    isSelfHosted:
        !isDesktop &&
        !/^http(s?):\/\/((localhost:8085)|((app|beta)\.keeweb\.info))/.test(location.href),
    isLocal: location.origin.indexOf('localhost') >= 0,
    canUseWasmInWebWorker: !isDesktop && !/Chrome/.test(navigator.appVersion), // TODO: enable it back in Chrome

    supportsTitleBarStyles() {
        return this.isMac;
    },
    hasUnicodeFlags() {
        return this.isMac;
    },
    getBrowserCssClass() {
        if (window.chrome && window.navigator.userAgent.indexOf('Chrome/') > -1) {
            return 'chrome';
        }
        if (window.navigator.userAgent.indexOf('Edge/') > -1) {
            return 'edge';
        }
        if (navigator.standalone) {
            return 'standalone';
        }
        return '';
    }
};

export { Features };
