import '../css/app.css';
import './bootstrap';

import type { ComponentType } from 'react';
import axios from 'axios';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

import BiometricOptInGate from './Components/Auth/BiometricOptInGate';
import AppHead from './Components/AppHead';
import OfflineBanner from './Components/OfflineBanner';
import PushNotificationsSync from './Components/PushNotificationsSync';
import ProgressIndicator from './Components/ProgressIndicator';
import { ThemeProvider } from './Contexts/ThemeContext';
import { bootstrapAppUiVersion } from './utils/appUiVersion';
import { clearStuckUiOverlays } from './utils/clearStuckUiOverlays';

bootstrapAppUiVersion();

const defaultAppName = import.meta.env.VITE_APP_NAME || '';

type SharedPageProps = { csrf_token?: string; appName?: string };

function hideSplashScreen() {
    const el = document.getElementById('ns-splash');
    if (!el) return;
    el.id = 'ns-splash-fadeout';
    window.setTimeout(() => {
        el.remove();
    }, 320);
}

function currentCsrfToken(props?: SharedPageProps): string {
    return (
        props?.csrf_token ??
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ??
        ''
    );
}

function syncAxiosCsrfToken(props: SharedPageProps | undefined) {
    const token = currentCsrfToken(props);
    if (!token) {
        return;
    }
    axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
    if (meta) {
        meta.content = token;
    }
}

function attachCsrfHeaderToVisit(visit: { headers?: Record<string, string> }) {
    const token = currentCsrfToken(
        (window as unknown as { __inertia?: { page?: { props?: SharedPageProps } } }).__inertia?.page?.props,
    );
    if (!token) {
        return;
    }
    visit.headers = { ...visit.headers, 'X-CSRF-TOKEN': token };
}

createInertiaApp({
    title: (title) => {
        const page = (window as unknown as { __inertia?: { page?: { props?: SharedPageProps } } }).__inertia?.page;
        const currentName = page?.props?.appName || defaultAppName;
        // Evita sufixos tipo " - Laravel" no título da aba.
        return title || currentName || '';
    },
        resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ).then((module: unknown) => {
            const { default: Page } = module as { default: ComponentType<object> };
            return function ResolvedPage(props: object) {
                return (
                    <>
                        <AppHead />
                        <Page {...props} />
                    </>
                );
            };
        }),
    setup({ el, App, props }) {
        const inertiaProps = props as {
            initialPage: { props: SharedPageProps };
            initialComponent: ComponentType<object>;
            resolveComponent: (name: string) => Promise<ComponentType<object>>;
            titleCallback?: (title: string) => string;
        };

        syncAxiosCsrfToken(inertiaProps.initialPage.props);

        router.on('before', (event) => {
            attachCsrfHeaderToVisit(event.detail.visit);
        });

        router.on('success', (event) => {
            syncAxiosCsrfToken(event.detail.page.props as SharedPageProps);
            clearStuckUiOverlays();
        });

        router.on('invalid', (event) => {
            const status = event.detail.response?.status;
            if (status === 419) {
                event.preventDefault();
                window.location.reload();
                return;
            }
            // Resposta HTML de 403 (ex.: link antigo de notificação sem permissão) — evita modal «403 | USER DOES NOT…».
            if (status === 403) {
                event.preventDefault();
                const fallback =
                    typeof route === 'function'
                        ? route('mobile.notifications')
                        : '/mobile/notifications';
                router.visit(fallback, { preserveScroll: true });
            }
        });

        const root = createRoot(el);

        root.render(
            <ThemeProvider>
                <BiometricOptInGate />
                <OfflineBanner />
                <PushNotificationsSync />
                <ProgressIndicator />
                <App {...props} />
            </ThemeProvider>
        );

        // Remove initial HTML splash after React mounts.
        // requestAnimationFrame ensures first paint happens before fadeout.
        requestAnimationFrame(() => hideSplashScreen());
        window.setTimeout(hideSplashScreen, 1500);
    },
    progress: {
        color: '#4B5563',
        showSpinner: false,
        delay: 250,
    },
});
