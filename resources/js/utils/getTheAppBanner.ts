import { Capacitor } from '@capacitor/core';

export const GET_THE_APP_BANNER_HEIGHT = '3.25rem';
export const GET_THE_APP_BANNER_STORAGE_KEY = 'ns-get-the-app-banner-dismissed-at';
/** Tempo em que o aviso permanece oculto após o usuário fechar (14 dias). */
export const GET_THE_APP_BANNER_DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

export type GetTheAppPlatform = 'apple' | 'android' | null;

export function getTheAppPlatform(): GetTheAppPlatform {
    if (typeof navigator === 'undefined') {
        return null;
    }

    const ua = navigator.userAgent;
    const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    if (/iPhone|iPad|iPod/i.test(ua) || iPadOs) {
        return 'apple';
    }
    if (/Android/i.test(ua)) {
        return 'android';
    }

    return null;
}

/** Celular no navegador — não app nativo, não tablet, não desktop. */
export function isPhoneWebBrowser(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return false;
    }

    if (Capacitor.isNativePlatform()) {
        return false;
    }

    const ua = navigator.userAgent;
    const iPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (iPad) {
        return false;
    }

    const androidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
    if (androidTablet) {
        return false;
    }

    const phoneUa = /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const narrow = window.matchMedia('(max-width: 767px)').matches;

    return phoneUa && narrow;
}

export function isGetTheAppBannerDismissed(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        const raw = window.localStorage.getItem(GET_THE_APP_BANNER_STORAGE_KEY);
        if (!raw) {
            return false;
        }
        const at = Number.parseInt(raw, 10);
        if (!Number.isFinite(at)) {
            return false;
        }

        return Date.now() - at < GET_THE_APP_BANNER_DISMISS_MS;
    } catch {
        return false;
    }
}

export function dismissGetTheAppBanner(): void {
    try {
        window.localStorage.setItem(GET_THE_APP_BANNER_STORAGE_KEY, String(Date.now()));
    } catch {
        // modo privado / storage cheio
    }
}

export function pickGetTheAppStoreUrl(
    iosAppStoreUrl: string | null | undefined,
    androidPlayStoreUrl: string | null | undefined,
    fallbackUrl: string,
): string | null {
    const apple = (iosAppStoreUrl ?? '').trim();
    const play = (androidPlayStoreUrl ?? '').trim();
    if (!apple && !play) {
        return null;
    }

    const platform = getTheAppPlatform();
    if (platform === 'apple' && apple) {
        return apple;
    }
    if (platform === 'android' && play) {
        return play;
    }

    if (apple && play) {
        return fallbackUrl;
    }

    return apple || play || null;
}

export function shouldHideGetTheAppBannerOnPage(component: string, url: string): boolean {
    if (component === 'AppDownloadLanding') {
        return true;
    }
    if (component.startsWith('Mobile/NsWhats/')) {
        return true;
    }

    const path = url.split('?')[0] ?? url;
    if (path === '/app' || path === '/baixe' || path === '/baixar' || path.startsWith('/baixe/') || path.startsWith('/app/')) {
        return true;
    }

    return false;
}

export function applyGetTheAppBannerCssVars(visible: boolean): void {
    if (typeof document === 'undefined') {
        return;
    }

    const root = document.documentElement;
    if (visible) {
        root.style.setProperty('--ns-get-app-banner-h', GET_THE_APP_BANNER_HEIGHT);
        root.style.setProperty(
            '--ns-get-app-banner-offset',
            `calc(${GET_THE_APP_BANNER_HEIGHT} + env(safe-area-inset-top, 0px))`,
        );
        root.style.setProperty('--ns-topbar-safe-top', '0px');
        root.classList.add('ns-get-app-banner');
        return;
    }

    root.style.setProperty('--ns-get-app-banner-h', '0px');
    root.style.setProperty('--ns-get-app-banner-offset', '0px');
    root.style.setProperty('--ns-topbar-safe-top', 'env(safe-area-inset-top, 0px)');
    root.classList.remove('ns-get-app-banner');
}
