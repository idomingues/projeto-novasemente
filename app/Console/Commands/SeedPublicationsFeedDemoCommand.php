<?php

namespace App\Console\Commands;

use App\Models\AcervoItem;
use App\Models\CharityCampaign;
use App\Models\Church;
use App\Models\Culto;
use App\Models\DonationCampaign;
use App\Models\Event;
use App\Models\LibraryBook;
use App\Models\Musica;
use App\Models\News;
use App\Models\PhotoAlbum;
use App\Models\PrayerRequest;
use App\Models\RevistaAdventistaArticle;
use App\Models\TalentCategory;
use App\Models\TalentListing;
use App\Models\User;
use App\Support\PublicationDemoMarker;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

#[AsCommand(
    name: 'app:seed-publications-feed-demo',
    description: 'Cria ou atualiza uma publicação de exemplo de cada tipo para testar o feed unificado',
)]
class SeedPublicationsFeedDemoCommand extends Command
{
    private const DEMO_COVER = 'https://images.unsplash.com/photo-1507692049790-ef8f2f3771f1?auto=format&fit=crop&w=1200&q=80';

    private const DEMO_COVER_HEALTH = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80';

    private const DEMO_COVER_LIBRARY = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1200&q=80';

    private const DEMO_COVER_NEWS = 'https://images.unsplash.com/photo-1529070538214-4288a7a79b91?auto=format&fit=crop&w=1200&q=80';

    private const DEMO_COVER_PHOTOS = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80';

    private const DEMO_COVER_REVISTA = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80';

    protected $signature = 'app:seed-publications-feed-demo
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

        $now = now();
        $created = [];

        $created[] = $this->seedNews($church, $author, $now);
        $created[] = $this->seedHealth($church, $author, $now);
        $created[] = $this->seedCulto($church, $author, $now);
        $created[] = $this->seedPrayer($church, $author, $now);
        $created[] = $this->seedCharityCampaign($church, $author, $now);
        $created[] = $this->seedLibraryBook($church, $author, $now);
        $created[] = $this->seedPhotoAlbum($church, $author, $now);
        $created[] = $this->seedEvent($church, $author, $now);
        $created[] = $this->seedRevistaArticle($now);
        $created[] = $this->seedTalentListing($church, $author, $now);
        $created[] = $this->seedAcervoItem();
        $created[] = $this->seedMusica($church, $author, $now);
        $created[] = $this->seedDonationCampaign($church, $author, $now);

        $this->info("Igreja: {$church->name} (id {$church->id})");
        $this->info("Autor: {$author->name} <{$author->email}>");
        $this->line('');
        foreach ($created as $line) {
            $this->info($line);
        }
        $this->line('');
        $this->comment('Abra o app em Mais → Publicações (usuário com acesso preview).');

        return self::SUCCESS;
    }

    private function resolveAuthor(Church $church): ?User
    {
        $email = $this->option('author');
        if (is_string($email) && trim($email) !== '') {
            return User::query()->where('email', trim($email))->first();
        }

        return User::query()
            ->where('church_id', $church->id)
            ->whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'super_admin']))
            ->orderBy('id')
            ->first()
            ?? User::query()->orderBy('id')->first();
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

    private function seedNews(Church $church, User $author, \DateTimeInterface $now): string
    {
        $title = PublicationDemoMarker::title('Notícias');
        $slug = PublicationDemoMarker::slug('noticias');

        $post = News::query()->updateOrCreate(
            ['slug' => $slug, 'church_id' => $church->id],
            [
                'section' => News::SECTION_NEWS,
                'title' => $title,
                'content_type' => News::TYPE_ARTICLE,
                'excerpt' => 'Exemplo de notícia para o feed unificado de publicações.',
                'body' => '<p>Conteúdo de demonstração do feed de publicações.</p>',
                'image_url' => self::DEMO_COVER_NEWS,
                'published_at' => $now,
                'is_active' => true,
                'created_by' => $author->id,
            ],
        );

        return "Notícias — id {$post->id}";
    }

    private function seedHealth(Church $church, User $author, \DateTimeInterface $now): string
    {
        $title = PublicationDemoMarker::title('Saúde');
        $slug = PublicationDemoMarker::slug('saude');

        $post = News::query()->updateOrCreate(
            ['slug' => $slug, 'church_id' => $church->id],
            [
                'section' => News::SECTION_HEALTH,
                'title' => $title,
                'content_type' => News::TYPE_ARTICLE,
                'excerpt' => 'Exemplo de conteúdo de saúde no feed.',
                'body' => '<p>Artigo de saúde para teste do feed.</p>',
                'image_url' => self::DEMO_COVER_HEALTH,
                'published_at' => $now,
                'is_active' => true,
                'created_by' => $author->id,
            ],
        );

        return "Saúde — id {$post->id}";
    }

    private function seedCulto(Church $church, User $author, \DateTimeInterface $now): string
    {
        $title = PublicationDemoMarker::title('Assistir ao Vivo');

        $culto = Culto::query()->updateOrCreate(
            ['church_id' => $church->id, 'title' => $title],
            [
                'youtube_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'published_at' => $now,
                'created_by' => $author->id,
            ],
        );

        return "Culto — id {$culto->id}";
    }

    private function seedPrayer(Church $church, User $author, \DateTimeInterface $now): string
    {
        $request = PublicationDemoMarker::title('Pedido de Oração');

        $prayer = PrayerRequest::query()->updateOrCreate(
            ['church_id' => $church->id, 'request' => $request],
            [
                'user_id' => $author->id,
                'name_or_nickname' => 'Demonstração Feed',
                'is_anonymous' => false,
                'active' => true,
                'needs_review' => false,
                'prayer_amen_count' => 0,
            ],
        );

        return "Oração — id {$prayer->id}";
    }

    private function seedCharityCampaign(Church $church, User $author, \DateTimeInterface $now): string
    {
        $title = PublicationDemoMarker::title('Doação');
        $coverPath = $this->publishDemoAsset(
            'resources/demo/talents/central-servicos-exemplo.png',
            'publications-feed/demo/charity-cover.png',
        );

        $campaign = CharityCampaign::query()->updateOrCreate(
            ['church_id' => $church->id, 'title' => $title],
            [
                'description' => 'Campanha de doação de exemplo para o feed unificado.',
                'type' => CharityCampaign::TYPE_MONEY,
                'progress_mode' => CharityCampaign::PROGRESS_MONEY,
                'goal_amount' => 1000,
                'raised_amount' => 0,
                'status' => CharityCampaign::STATUS_ACTIVE,
                'cover_image_path' => $coverPath,
                'created_by' => $author->id,
            ],
        );

        return "Doação — id {$campaign->id}";
    }

    private function seedLibraryBook(Church $church, User $author, \DateTimeInterface $now): string
    {
        $title = PublicationDemoMarker::title('Biblioteca');

        $book = LibraryBook::query()->updateOrCreate(
            ['church_id' => $church->id, 'title' => $title],
            [
                'subtitle' => 'Publicação de exemplo',
                'description' => 'Livro de demonstração para o feed de publicações.',
                'category' => LibraryBook::CATEGORY_BOOKS,
                'source_cover_url' => self::DEMO_COVER_LIBRARY,
                'published_at' => $now,
                'created_by' => $author->id,
            ],
        );

        return "Biblioteca — id {$book->id}";
    }

    private function seedPhotoAlbum(Church $church, User $author, \DateTimeInterface $now): string
    {
        $title = PublicationDemoMarker::title('Fotos');

        $album = PhotoAlbum::query()->updateOrCreate(
            ['church_id' => $church->id, 'title' => $title],
            [
                'photographer_name' => 'Equipe Nova Semente',
                'drive_folder_url' => 'https://drive.google.com/drive/folders/demo-feed',
                'cover_image_url' => self::DEMO_COVER_PHOTOS,
                'published_at' => $now,
                'created_by' => $author->id,
            ],
        );

        return "Fotos — id {$album->id}";
    }

    private function seedEvent(Church $church, User $author, \DateTimeInterface $now): string
    {
        $title = PublicationDemoMarker::title('Eventos');

        $event = Event::query()->updateOrCreate(
            ['church_id' => $church->id, 'title' => $title],
            [
                'description' => 'Evento de exemplo para o feed unificado.',
                'starts_at' => now()->addDays(7),
                'published_at' => $now,
                'is_active' => true,
                'all_day' => false,
                'image_url' => self::DEMO_COVER,
                'created_by' => $author->id,
            ],
        );

        return "Eventos — id {$event->id}";
    }

    private function seedRevistaArticle(\DateTimeInterface $now): string
    {
        $title = PublicationDemoMarker::title('Revista Adventista');
        $slug = PublicationDemoMarker::slug('revista');

        $article = RevistaAdventistaArticle::query()->updateOrCreate(
            ['slug' => $slug],
            [
                'wp_post_id' => 900000001,
                'title' => $title,
                'excerpt' => 'Artigo de exemplo para o feed de publicações.',
                'body' => '<p>Conteúdo de demonstração da Revista Adventista.</p>',
                'author_name' => 'Redação',
                'source_url' => 'https://example.com/revista/demo-feed',
                'image_url' => self::DEMO_COVER_REVISTA,
                'section' => RevistaAdventistaArticle::SECTION_ARTIGOS,
                'is_active' => true,
                'published_at' => $now,
                'synced_at' => $now,
            ],
        );

        return "Revista Adventista — id {$article->id}";
    }

    private function seedTalentListing(Church $church, User $author, \DateTimeInterface $now): string
    {
        $this->callSilent('db:seed', ['--class' => 'TalentCategorySeeder']);

        $category = TalentCategory::query()
            ->whereNull('church_id')
            ->orderBy('sort_order')
            ->first();

        if ($category === null) {
            throw new \RuntimeException('Categorias da Central de Serviços não encontradas.');
        }

        $title = PublicationDemoMarker::title('Central de Serviços');
        $photoPath = $this->publishDemoAsset(
            'resources/demo/talents/central-servicos-exemplo.png',
            'publications-feed/demo/talent-cover.png',
        );

        $listing = TalentListing::query()->updateOrCreate(
            ['church_id' => $church->id, 'title' => $title],
            [
                'user_id' => $author->id,
                'category_id' => $category->id,
                'type' => TalentListing::TYPE_OFFER,
                'description' => 'Publicação de exemplo na Central de Serviços para o feed.',
                'photo_path' => $photoPath,
                'status' => TalentListing::STATUS_APPROVED,
                'moderated_by' => $author->id,
                'moderated_at' => $now,
                'member_declaration_at' => $now,
            ],
        );

        return "Central de Serviços — id {$listing->id}";
    }

    private function seedAcervoItem(): string
    {
        $title = PublicationDemoMarker::title('Novas Séries');

        $item = AcervoItem::query()->updateOrCreate(
            ['title' => $title],
            [
                'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'thumbnail_url' => 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
                'video_count' => 3,
                'order' => 9999,
            ],
        );

        return "Séries — id {$item->id}";
    }

    private function seedMusica(Church $church, User $author, \DateTimeInterface $now): string
    {
        $title = PublicationDemoMarker::title('Música');

        $musica = Musica::query()->updateOrCreate(
            ['church_id' => $church->id, 'title' => $title],
            [
                'youtube_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'published_at' => $now,
                'created_by' => $author->id,
            ],
        );

        return "Música — id {$musica->id}";
    }

    private function seedDonationCampaign(Church $church, User $author, \DateTimeInterface $now): string
    {
        $title = PublicationDemoMarker::title('Oferta Nova Semente');
        $coverPath = $this->publishDemoAsset(
            'resources/demo/talents/doar-talentos-exemplo.png',
            'publications-feed/demo/donation-campaign-cover.png',
        );

        $campaign = DonationCampaign::query()->updateOrCreate(
            ['church_id' => $church->id, 'title' => $title],
            [
                'description' => 'Campanha de exemplo para o feed unificado.',
                'goal_amount' => 5000,
                'raised_amount' => 0,
                'status' => DonationCampaign::STATUS_ACTIVE,
                'cover_image_path' => $coverPath,
                'story_video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'created_by' => $author->id,
            ],
        );

        return "Oferta Nova Semente — id {$campaign->id}";
    }
}
