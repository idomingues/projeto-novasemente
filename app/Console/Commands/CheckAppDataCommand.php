<?php

namespace App\Console\Commands;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\PhotoAlbum;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Diagnóstico rápido: teste de conexão (PDO + SELECT 1), count em users, e contagens mínimas (igrejas, etc.).
 */
class CheckAppDataCommand extends Command
{
    protected $signature = 'app:check-data';

    protected $description = 'Testa conexão à BD, conta utilizadores (users) e mostra outras contagens úteis.';

    public function handle(): int
    {
        $default = (string) config('database.default');
        $this->line('Ligação por defeito: <fg=cyan>'.$default.'</>');
        $this->describeConfiguredConnection($default);

        if ($default === 'sqlite') {
            $path = (string) config('database.connections.sqlite.database');
            $this->line('Ficheiro SQLite: <fg=cyan>'.$path.'</>');
            if ($path !== ':memory:' && ! file_exists($path)) {
                $this->error('O ficheiro SQLite não existe. Crie com: touch database/database.sqlite && php artisan migrate');

                return self::FAILURE;
            }
            if ($path !== ':memory:' && ! is_writable($path)) {
                $this->warn('O ficheiro SQLite não é gravável pelo PHP.');
            }
        }

        $this->newLine();
        $this->line('--- Teste de conexão ---');
        try {
            $pdo = DB::connection()->getPdo();
            $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
            $this->info('PDO: OK (driver: '.$driver.').');
            $one = DB::selectOne('select 1 as ok');
            $ok = is_object($one) && isset($one->ok) && (int) $one->ok === 1;
            if ($ok) {
                $this->info('Query de teste (SELECT 1): OK.');
            } else {
                $this->warn('Query de teste (SELECT 1): resposta inesperada.');
            }
            if (in_array($driver, ['mysql', 'mariadb'], true)) {
                $dbRow = DB::selectOne('select database() as db');
                $dbName = is_object($dbRow) && isset($dbRow->db) ? (string) $dbRow->db : '';
                if ($dbName !== '') {
                    $this->line('Base de dados <fg=cyan>activa</> na sessão (DATABASE()): <fg=cyan>'.$dbName.'</>');
                }
            }
        } catch (\Throwable $e) {
            $this->error('Falha na conexão / teste: '.$e->getMessage());

            return self::FAILURE;
        }

        if (Schema::hasTable('users')) {
            try {
                $userCount = User::query()->count();
                $this->line('Utilizadores (<fg=cyan>users</>): <fg=cyan>'.$userCount.'</>');
            } catch (\Throwable $e) {
                $this->error('Erro ao contar users: '.$e->getMessage());

                return self::FAILURE;
            }
        } else {
            $this->warn('Tabela users ainda não existe — rode: php artisan migrate');
        }

        $this->newLine();
        $this->line('--- Outras contagens ---');

        try {
            $churches = Schema::hasTable('churches') ? Church::query()->count() : -1;
            $activeChurches = Schema::hasTable('churches')
                ? Church::query()->where('active', true)->count()
                : -1;
            $this->line('Igrejas (total / activas): <fg=cyan>'.$churches.' / '.$activeChurches.'</>');
            if ($churches === 0) {
                $this->warn('Sem igrejas na tabela churches — notícias, eventos, fotos e voluntários por igreja ficam vazios.');
            }

            if (Schema::hasTable('ministries')) {
                $this->line('Ministérios: <fg=cyan>'.Ministry::query()->count().'</>');
            }
            if (Schema::hasTable('volunteers')) {
                $volunteersSql = (int) DB::table('volunteers')->count();
                $volunteersModel = Volunteer::query()->count();
                $this->line('Voluntários (<fg=cyan>COUNT(*) na tabela volunteers</>): <fg=cyan>'.$volunteersSql.'</>');
                if ($volunteersModel !== $volunteersSql) {
                    $this->warn('Voluntários (model Eloquent): '.$volunteersModel.' — difere do COUNT SQL (scopes/filtros?).');
                }
                if ($volunteersSql === 0) {
                    $this->warn('Se o Sequel Ace mostra linhas aqui, o Laravel está noutra BD: alinhe DB_HOST / DB_DATABASE no .env com a ligação do Sequel Ace.');
                }
            }
            if (Schema::hasTable('photo_albums')) {
                $this->line('Álbuns de fotos: <fg=cyan>'.PhotoAlbum::query()->count().'</>');
            }
            if (Schema::hasTable('library_books')) {
                $this->line('Biblioteca (library_books): <fg=cyan>'.(int) DB::table('library_books')->count().'</>');
            } else {
                $this->warn('Tabela library_books ausente — /biblioteca falha até correr: php artisan migrate');
            }
            if (Schema::hasTable('volunteer_self_signup_tokens')) {
                $this->line('Tokens cadastro voluntário: <fg=cyan>'.DB::table('volunteer_self_signup_tokens')->count().'</>');
            } else {
                $this->warn('Tabela volunteer_self_signup_tokens ausente — rode as migrations.');
            }
        } catch (\Throwable $e) {
            $this->error('Erro nas contagens: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->newLine();
        $this->line('Se /mobile/fotos devolver 404, limpe caches de rotas: <fg=yellow>php artisan route:clear</>');

        return self::SUCCESS;
    }

    private function describeConfiguredConnection(string $default): void
    {
        $cfg = config('database.connections.'.$default);
        if (! is_array($cfg)) {
            return;
        }

        if ($default === 'sqlite') {
            return;
        }

        $host = (string) ($cfg['host'] ?? '');
        $port = (string) ($cfg['port'] ?? '');
        $database = (string) ($cfg['database'] ?? '');
        $username = (string) ($cfg['username'] ?? '');
        $socket = isset($cfg['unix_socket']) ? (string) $cfg['unix_socket'] : '';

        $this->line('Config .env / config: host=<fg=cyan>'.$host.'</> port=<fg=cyan>'.$port.'</> database=<fg=cyan>'.$database.'</> user=<fg=cyan>'.$username.'</>');
        if ($socket !== '') {
            $this->line('Unix socket: <fg=cyan>'.$socket.'</>');
        }
    }
}
