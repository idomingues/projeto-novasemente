import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Fallback visível no cliente quando o servidor não envia appVersion (ex.: deploy sem pasta android/). */
function readAndroidVersionNameForDefine() {
    try {
        const gradle = readFileSync(path.join(__dirname, 'android/app/build.gradle'), 'utf8');
        const m = gradle.match(/versionName\s+["']([^"']+)["']/);
        return m ? m[1].trim() : '';
    } catch {
        return '';
    }
}

const frontBundleVersionHint =
    process.env.VITE_APP_DISPLAY_VERSION?.trim() || readAndroidVersionNameForDefine() || '';

export default defineConfig({
    define: {
        __APP_FRONT_BUNDLE_VERSION__: JSON.stringify(frontBundleVersionHint),
    },
    plugins: [
        tailwindcss(),
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
    ],
});
