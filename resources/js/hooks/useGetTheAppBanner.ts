import { usePage } from '@inertiajs/react';
import { useCallback, useLayoutEffect, useState } from 'react';
import {
    applyGetTheAppBannerCssVars,
    dismissGetTheAppBanner,
    isGetTheAppBannerDismissed,
    isPhoneWebBrowser,
    pickGetTheAppStoreUrl,
    shouldHideGetTheAppBannerOnPage,
} from '@/utils/getTheAppBanner';

type PageProps = {
    appName?: string | null;
    appLogoUrl?: string | null;
    defaultBrandLogoUrl?: string | null;
    iosAppStoreUrl?: string | null;
    androidPlayStoreUrl?: string | null;
    currentChurch?: { name?: string | null; logo_url?: string | null } | null;
};

export function useGetTheAppBanner() {
    const { props, url, component } = usePage();
    const page = props as PageProps;
    const [visible, setVisible] = useState(false);

    const storeUrl = pickGetTheAppStoreUrl(
        page.iosAppStoreUrl,
        page.androidPlayStoreUrl,
        typeof route === 'function' ? route('app.download') : '/app',
    );

    const appName = (page.appName ?? page.currentChurch?.name ?? 'Nova Semente').trim() || 'Nova Semente';
    const logoUrl =
        page.currentChurch?.logo_url ?? page.appLogoUrl ?? page.defaultBrandLogoUrl ?? '/logo-ns.png';

    const evaluate = useCallback(() => {
        if (!storeUrl || shouldHideGetTheAppBannerOnPage(String(component ?? ''), String(url ?? ''))) {
            return false;
        }
        if (isGetTheAppBannerDismissed()) {
            return false;
        }

        return isPhoneWebBrowser();
    }, [component, storeUrl, url]);

    useLayoutEffect(() => {
        const sync = () => {
            const next = evaluate();
            setVisible(next);
            applyGetTheAppBannerCssVars(next);
        };

        sync();

        const mq = window.matchMedia('(max-width: 767px)');
        mq.addEventListener('change', sync);
        window.addEventListener('orientationchange', sync);
        window.addEventListener('resize', sync);

        return () => {
            mq.removeEventListener('change', sync);
            window.removeEventListener('orientationchange', sync);
            window.removeEventListener('resize', sync);
        };
    }, [evaluate]);

    const dismiss = useCallback(() => {
        dismissGetTheAppBanner();
        setVisible(false);
        applyGetTheAppBannerCssVars(false);
    }, []);

    return {
        visible,
        dismiss,
        storeUrl: storeUrl ?? '',
        appName,
        logoUrl,
    };
}
