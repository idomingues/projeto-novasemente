<?php

namespace App\Console\Commands;

use App\Models\Church;
use App\Models\SharedTalentCategory;
use App\Models\SharedTalentListing;
use App\Models\TalentCategory;
use App\Models\TalentListing;
use App\Models\User;
use App\Support\SharedTalentListingStatus;
use App\Support\TalentDemoListing;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

#[AsCommand(
    name: 'app:seed-talent-demo-listings',
    description: 'Cria ou atualiza publicações de exemplo na Central de Serviços e em Doar Talentos',
)]
class SeedTalentDemoListingsCommand extends Command
{
    protected $signature = 'app:seed-talent-demo-listings
                            {--church=nova-semente : Slug da igreja (padrão: nova-semente)}
                            {--author= : E-mail do autor (padrão: primeiro admin da igreja)}';

    public function handle(): int
    {
        $church = Church::query()->where('slug', $this->option('church'))->first()
            ?? Church::query()->where('active', true)->orderBy('id')->first();

        if ($church === null) {
            $this->error('Nenhuma igreja encontrada. Rode as migrações e o ChurchSeeder antes.');

            return self::FAILURE;
        }

        $author = $this->resolveAuthor($church);
        if ($author === null) {
            $this->error('Nenhum usuário encontrado para publicar os exemplos. Informe --author=email.');

            return self::FAILURE;
        }

        $this->ensureCategories();

        $connectionPhoto = $this->publishDemoAsset(
            'resources/demo/talents/central-servicos-exemplo.png',
            'talents/demo/central-servicos-exemplo.png',
        );
        $sharedPhoto = $this->publishDemoAsset(
            'resources/demo/talents/doar-talentos-exemplo.png',
            'shared-talents/demo/doar-talentos-exemplo.png',
        );

        $connectionCategory = TalentCategory::query()
            ->whereNull('church_id')
            ->where('slug', 'informatica')
            ->first()
            ?? TalentCategory::query()->whereNull('church_id')->orderBy('sort_order')->first();

        $sharedCategory = SharedTalentCategory::query()
            ->whereNull('church_id')
            ->where('slug', 'musica')
            ->first()
            ?? SharedTalentCategory::query()->whereNull('church_id')->orderBy('sort_order')->first();

        if ($connectionCategory === null || $sharedCategory === null) {
            $this->error('Categorias não encontradas. Rode TalentCategorySeeder e SharedTalentCategorySeeder.');

            return self::FAILURE;
        }

        $now = now();

        $connection = TalentListing::query()->updateOrCreate(
            ['notes' => TalentDemoListing::marker(TalentDemoListing::CONNECTION_SLUG)],
            [
                'church_id' => $church->id,
                'user_id' => $author->id,
                'category_id' => $connectionCategory->id,
                'title' => '📌 Exemplo — Conserto de computadores',
                'type' => TalentListing::TYPE_OFFER,
                'description' => "⚠️ Esta publicação é apenas um exemplo visual para mostrar como fica um anúncio real na Central de Serviços.\n\n"
                    ."Não é um pedido nem uma oferta ativa — serve para inspirar membros a publicarem talentos de verdade.\n\n"
                    ."No exemplo: um membro oferece ajuda com computadores no dia a dia — formatação, lentidão, troca de peças simples, backup de arquivos e orientação básica. "
                    ."É um serviço entre pessoas da comunidade, fora das atividades da igreja; valores e combinações ficam direto entre quem publica e quem precisa.",
                'locality' => 'Região local (exemplo)',
                'availability' => 'Segunda à tarde · combinar pelo app (somente ilustrativo)',
                'contact_whatsapp' => '(11) 99999-0000',
                'contact_email' => 'exemplo.conserto@email.com',
                'contact_instagram' => 'novasemente.exemplo',
                'allows_exchange' => false,
                'allows_negotiation' => true,
                'photo_path' => $connectionPhoto,
                'status' => TalentListing::STATUS_APPROVED,
                'rejection_reason' => null,
                'moderated_by' => $author->id,
                'moderated_at' => $now,
                'member_declaration_at' => $now,
            ],
        );

        $shared = SharedTalentListing::query()->updateOrCreate(
            ['notes' => TalentDemoListing::marker(TalentDemoListing::SHARED_SLUG)],
            [
                'church_id' => $church->id,
                'user_id' => $author->id,
                'category_id' => $sharedCategory->id,
                'title' => '📌 Exemplo — Violão para quem está começando',
                'description' => "⚠️ Esta publicação é apenas um exemplo visual para mostrar como fica um talento compartilhado no app.\n\n"
                    ."Não há aulas reais nem inscrições abertas — o objetivo é inspirar a comunidade a doar conhecimentos de forma gratuita e acolhedora.\n\n"
                    ."No exemplo: encontros leves para aprender acordes básicos, ritmo e músicas simples de louvor, presencial ou online, em pequenos grupos.",
                'slots_total' => 8,
                'slots_filled' => 2,
                'age_range' => SharedTalentListing::AGE_ALL,
                'age_range_notes' => null,
                'modality' => SharedTalentListing::MODALITY_HYBRID,
                'locality' => 'Demonstração — comunidade',
                'available_days' => 'Terças-feiras (exemplo)',
                'schedule_time' => '19h30 (exemplo)',
                'frequency' => 'Quinzenal (exemplo)',
                'duration_estimate' => '1 hora',
                'photo_path' => $sharedPhoto,
                'status' => SharedTalentListing::STATUS_ACTIVE,
                'rejection_reason' => null,
                'moderated_by' => $author->id,
                'moderated_at' => $now,
                'member_declaration_at' => $now,
            ],
        );

        $this->info("Igreja: {$church->name} (id {$church->id})");
        $this->info("Autor: {$author->name} <{$author->email}>");
        $this->line('');
        $this->info("Central de Serviços — id {$connection->id}: {$connection->title}");
        $this->info("Doar Talentos — id {$shared->id}: {$shared->title}");
        $this->line('');
        $this->comment('Para produção, rode o mesmo comando no servidor após o deploy:');
        $this->line('  php artisan app:seed-talent-demo-listings');

        return self::SUCCESS;
    }

    private function resolveAuthor(Church $church): ?User
    {
        $email = $this->option('author');
        if (is_string($email) && trim($email) !== '') {
            return User::query()->where('email', trim($email))->first();
        }

        return User::query()
            ->whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'super_admin']))
            ->orderBy('id')
            ->first()
            ?? User::query()->orderBy('id')->first();
    }

    private function ensureCategories(): void
    {
        $this->callSilent('db:seed', ['--class' => 'TalentCategorySeeder']);
        $this->callSilent('db:seed', ['--class' => 'SharedTalentCategorySeeder']);
    }

    private function publishDemoAsset(string $sourceRelative, string $storageRelative): string
    {
        $source = base_path($sourceRelative);
        if (! File::isFile($source)) {
            throw new \RuntimeException("Arquivo de demonstração não encontrado: {$sourceRelative}");
        }

        Storage::disk('public')->makeDirectory(dirname($storageRelative));
        Storage::disk('public')->put($storageRelative, File::get($source));

        return $storageRelative;
    }
}
