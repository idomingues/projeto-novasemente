import { existsSync } from 'node:fs';
import { platform } from 'node:os';

const iosAssets = 'ios/App/App/Assets.xcassets';
const androidRes = 'android/app/src/main/res';

if (platform() !== 'darwin') {
    console.error('');
    console.error('cap:assets é só para o Mac (geração de ícones/splash iOS e Android).');
    console.error('No servidor Ubuntu, o deploy do site é:');
    console.error('  npm ci && npm run build');
    console.error('');
    process.exit(1);
}

if (!existsSync(iosAssets) || !existsSync(androidRes)) {
    console.error('');
    console.error('Pastas ios/ ou android/ não encontradas. Rode na raiz do projeto com o app móvel completo.');
    console.error('');
    process.exit(1);
}
