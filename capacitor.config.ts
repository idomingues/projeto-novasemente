import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Laravel + Inertia precisa do servidor PHP: o WebView abre a URL abaixo (não só ficheiros estáticos).
 *
 * Por defeito usa produção, para builds Android/iOS nunca saírem sem servidor (evita ecrã vazio na Play).
 * Para desenvolvimento local, defina CAPACITOR_SERVER_URL antes de `npx cap sync`, por exemplo:
 * - Android Emulator + `php artisan serve`: http://10.0.2.2:8000
 * - Dispositivo na mesma rede: http://IP-DO-PC:8000
 * - Produção explícita: npm run cap:sync:prod (equivale à URL por defeito)
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL ?? 'https://app.novasemente.com.br';

const config: CapacitorConfig = {
    appId: 'br.org.novasemente.app',
    appName: 'Nova Semente',
    webDir: 'capacitor-www',
    server: {
        url: serverUrl,
        cleartext: serverUrl.startsWith('http://'),
    },
};

export default config;
