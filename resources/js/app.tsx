import '../css/app.css';
import './bootstrap';

import type { ComponentType } from 'react';
import axios from 'axios';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

import AppHead from './Components/AppHead';
import OfflineBanner from './Components/OfflineBanner';
import ProgressIndicator from './Components/ProgressIndicator';
import { ThemeProvider } from './Contexts/ThemeContext';

const defaultAppName = import.meta.env.VITE_APP_NAME || 'Laravel';

type SharedPageProps = { csrf_token?: string; appName?: string };

function hideSplashScreen() {
    const el = document.getElementById('ns-splash');
    if (!el) return;
    el.id = 'ns-splash-fadeout';
    window.setTimeout(() => {
        el.remove();
    }, 320);
}

function syncAxiosCsrfToken(props: SharedPageProps | undefined) {
    const token = props?.csrf_token;
    if (!token) {
        return;
    }
    axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
    if (meta) {
        meta.content = token;
    }
}

createInertiaApp({
    title: (title) => {
        const page = (window as unknown as { __inertia?: { page?: { props?: SharedPageProps } } }).__inertia?.page;
        const currentName = page?.props?.appName || defaultAppName;
        return `${title} - ${currentName}`;
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

        router.on('success', (event) => {
            syncAxiosCsrfToken(event.detail.page.props as SharedPageProps);
        });

        const root = createRoot(el);

        root.render(
            <ThemeProvider>
                <OfflineBanner />
                <ProgressIndicator />
                <App {...props} />
            </ThemeProvider>
        );

        // Remove initial HTML splash after React mounts.
        // requestAnimationFrame ensures first paint happens before fadeout.
        requestAnimationFrame(() => hideSplashScreen());
    },
    progress: {
        color: '#4B5563',
        showSpinner: true,
        delay: 0,
    },
});
