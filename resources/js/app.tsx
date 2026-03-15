import '../css/app.css';
import './bootstrap';

import type { ComponentType } from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

import AppHead from './Components/AppHead';
import { ThemeProvider } from './Contexts/ThemeContext';

const defaultAppName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${defaultAppName}`,
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
        const root = createRoot(el);

        root.render(
            <ThemeProvider>
                <App {...props} />
            </ThemeProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
