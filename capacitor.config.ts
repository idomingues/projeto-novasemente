import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Laravel + Inertia precisa do servidor PHP: o WebView abre a URL abaixo (não só ficheiros estáticos).
 *
 * Defina CAPACITOR_SERVER_URL antes de `npx cap sync` / builds nativos, por exemplo:
 * - Produção: https://app.novasemente.com.br (ou npm run cap:sync:prod)
 * - Android Emulator + `php artisan serve`: http://10.0.2.2:8000
 * - Dispositivo físico na mesma rede: http://IP-DO-PC:8000
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
    appId: 'br.org.novasemente.app',
    appName: 'Nova Semente',
    webDir: 'capacitor-www',
    ...(serverUrl
        ? {
              server: {
                  url: serverUrl,
                  cleartext: serverUrl.startsWith('http://'),
              },
          }
        : {}),
};

export default config;
