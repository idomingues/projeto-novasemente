<?php

namespace App\Console\Commands;

use App\Models\Church;
use App\Models\News;
use App\Models\Poll;
use App\Models\User;
use App\Support\StorageUrl;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

#[AsCommand(
    name: 'app:publish-launch-feed-items',
    description: 'Publica no feed: arte NS Whats + enquete do milagre (produção/dev)',
)]
class PublishLaunchFeedItemsCommand extends Command
{
    protected $signature = 'app:publish-launch-feed-items
                            {--church=nova-semente : Slug ou ID da igreja}
                            {--author= : E-mail do autor (padrão: admin da igreja)}';

    private const NS_WHATS_SLUG = 'ns-whats-comunicacao-entre-a-nova-semente';

    private const NS_WHATS_TITLE = 'NS Whats — comunicação entre a Nova Semente';

    private const NS_WHATS_BODY = <<<'TXT'
Falar com a igreja ficou mais simples.

O NS Whats conecta membros, voluntários e líderes em um só lugar — para dúvidas, pedidos, encaminhamentos e conversas do dia a dia da Nova Semente.

Abra o app.
Toque em NS Whats.
Escolha a área ou a pessoa e envie sua mensagem.

Comunicação clara. Equipe alinhada. Congregação mais perto.
TXT;

    private const MIRACLE_QUESTION = 'Qual milagre de Jesus você gostaria de ter presenciado?';

    public function handle(): int
    {
        $church = $this->resolveChurch();
        if ($church === null) {
            $this->error('Nenhuma igreja encontrada.');

            return self::FAILURE;
        }

        $author = $this->resolveAuthor($church);
        if ($author === null) {
            $this->error('Nenhum autor encontrado. Informe --author=email.');

            return self::FAILURE;
        }

        $this->ensureEnqueteCover();
        $news = $this->publishNsWhats($church, $author);
        $poll = $this->publishMiraclePoll($church);

        $this->info("Igreja: {$church->name} (#{$church->id})");
        $this->info("NS Whats feed — news #{$news->id} · {$news->slug}");
        if ($poll !== null) {
            $this->info("Enquete no feed — poll #{$poll->id} · publish_to_feed=true");
        } else {
            $this->warn('Enquete do milagre não encontrada. Rode polls:seed-launch antes.');
        }
        $this->comment('Arte enquete: public/images/publications/enquetes-feed-cover.png');

        return self::SUCCESS;
    }

    private function ensureEnqueteCover(): void
    {
        $dest = public_path('images/publications/enquetes-feed-cover.png');
        $seed = base_path('database/seed-assets/publications/enquetes-feed-cover.png');
        File::ensureDirectoryExists(dirname($dest));
        if (File::isFile($seed)) {
            File::copy($seed, $dest);
        }
    }

    private function publishNsWhats(Church $church, User $author): News
    {
        $seed = base_path('database/seed-assets/publications/ns-whats-feed-arte.png');
        if (! File::isFile($seed)) {
            throw new \RuntimeException('Arte NS Whats não encontrada em database/seed-assets/publications/ns-whats-feed-arte.png');
        }

        $storageRelative = 'news/ns-whats-feed-arte.png';
        Storage::disk('public')->makeDirectory('news');
        Storage::disk('public')->put($storageRelative, File::get($seed));
        $imageUrl = StorageUrl::publicMediaUrl($storageRelative);

        return News::query()->updateOrCreate(
            [
                'church_id' => $church->id,
                'slug' => self::NS_WHATS_SLUG,
            ],
            [
                'section' => News::SECTION_NEWS,
                'title' => self::NS_WHATS_TITLE,
                'content_type' => News::TYPE_INSTAGRAM_FEED,
                'excerpt' => null,
                'body' => self::NS_WHATS_BODY,
                'image_url' => $imageUrl,
                'published_at' => now(),
                'is_active' => true,
                'created_by' => $author->id,
                'has_video' => false,
                'video_path' => null,
                'pdf_path' => null,
                'youtube_url' => null,
                'instagram_url' => null,
            ],
        );
    }

    private function publishMiraclePoll(Church $church): ?Poll
    {
        $miracle = Poll::query()
            ->where('church_id', $church->id)
            ->where('question', self::MIRACLE_QUESTION)
            ->first();

        if ($miracle === null) {
            return null;
        }

        Poll::query()
            ->where('church_id', $church->id)
            ->where('id', '!=', $miracle->id)
            ->update(['publish_to_feed' => false]);

        $miracle->forceFill([
            'status' => Poll::STATUS_OPEN,
            'publish_to_feed' => true,
            'updated_at' => now(),
        ])->save();

        return $miracle->fresh();
    }

    private function resolveChurch(): ?Church
    {
        $opt = trim((string) $this->option('church'));
        if ($opt !== '' && ctype_digit($opt)) {
            return Church::query()->find((int) $opt);
        }
        if ($opt !== '') {
            return Church::query()->where('slug', $opt)->first();
        }

        return Church::query()->where('slug', 'nova-semente')->first()
            ?? Church::query()->where('active', true)->orderBy('id')->first();
    }

    private function resolveAuthor(Church $church): ?User
    {
        $email = trim((string) $this->option('author'));
        if ($email !== '') {
            return User::query()->where('email', $email)->first();
        }

        return User::query()
            ->where('church_id', $church->id)
            ->whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'super_admin']))
            ->orderBy('id')
            ->first()
            ?? User::query()->where('church_id', $church->id)->orderBy('id')->first();
    }
}
