<?php

namespace App\Services;

use App\Models\AcervoItem;
use App\Models\AppNotification;
use App\Models\CharityCampaign;
use App\Models\Culto;
use App\Models\DonationCampaign;
use App\Models\Event;
use App\Models\LibraryBook;
use App\Models\Musica;
use App\Models\News;
use App\Models\PhotoAlbum;
use Illuminate\Support\Str;

/** Notificação geral do app quando conteúdo publicado é criado (notícias, saúde, eventos, etc.). */
class PublicationBroadcastNotifier
{
    public function notifyNews(News $post, ?int $createdByUserId = null): ?AppNotification
    {
        if (! News::query()->whereKey($post->getKey())->visibleToPublic()->exists()) {
            return null;
        }

        $post->refresh();
        $isHealth = $post->section === News::SECTION_HEALTH;

        return $this->create(
            churchId: $post->church_id,
            prefix: $isHealth ? 'Nova publicação de saúde: ' : 'Nova notícia: ',
            title: $post->title,
            body: $this->bodyFromText($post->excerpt, $post->body),
            actionUrl: route(
                $isHealth ? 'mobile.health.show' : 'mobile.news.show',
                [$isHealth ? 'health' : 'news' => $post->slug],
                absolute: true,
            ),
            createdByUserId: $createdByUserId,
        );
    }

    public function notifyEvent(Event $event, ?int $createdByUserId = null): ?AppNotification
    {
        if (! Event::query()->whereKey($event->getKey())->visibleToPublic()->exists()) {
            return null;
        }

        $event->refresh();

        return $this->create(
            churchId: $event->church_id,
            prefix: 'Novo evento: ',
            title: $event->title,
            body: $this->bodyFromText($event->description),
            actionUrl: route('mobile.events', absolute: true).'?event='.$event->id,
            createdByUserId: $createdByUserId,
        );
    }

    public function notifyAcervo(AcervoItem $item, ?int $churchId, ?int $createdByUserId = null): ?AppNotification
    {
        return $this->create(
            churchId: $churchId,
            prefix: 'Nova série: ',
            title: $item->title,
            body: 'Toque para ver a playlist na app.',
            actionUrl: route('mobile.acervo.show', ['acervoItem' => $item->id], absolute: true),
            createdByUserId: $createdByUserId,
        );
    }

    public function notifyMusica(Musica $musica, ?int $createdByUserId = null): ?AppNotification
    {
        if (! Musica::query()->whereKey($musica->getKey())->visibleInApp()->exists()) {
            return null;
        }

        $musica->refresh();

        return $this->create(
            churchId: $musica->church_id,
            prefix: 'Nova música: ',
            title: $musica->title,
            body: 'Toque para ouvir na app.',
            actionUrl: route('mobile.musica.show', ['musica' => $musica->id], absolute: true),
            createdByUserId: $createdByUserId,
        );
    }

    public function notifyPhotoAlbum(PhotoAlbum $album, ?int $createdByUserId = null): ?AppNotification
    {
        if (! PhotoAlbum::query()->whereKey($album->getKey())->visibleInApp()->exists()) {
            return null;
        }

        $album->refresh();

        return $this->create(
            churchId: $album->church_id,
            prefix: 'Novo álbum de fotos: ',
            title: $album->title,
            body: filled($album->photographer_name)
                ? 'Fotos: '.$album->photographer_name
                : 'Toque para ver o álbum na app.',
            actionUrl: route('mobile.fotos.show', ['album' => $album->id], absolute: true),
            createdByUserId: $createdByUserId,
        );
    }

    public function notifyLibraryBook(LibraryBook $book, ?int $createdByUserId = null): ?AppNotification
    {
        if (! LibraryBook::query()->whereKey($book->getKey())->visibleInApp()->exists()) {
            return null;
        }

        $book->refresh();

        return $this->create(
            churchId: $book->church_id,
            prefix: 'Nova publicação na biblioteca: ',
            title: $book->title,
            body: $this->bodyFromText($book->subtitle, $book->description),
            actionUrl: route('mobile.biblioteca.show', ['libraryBook' => $book->id], absolute: true),
            createdByUserId: $createdByUserId,
        );
    }

    public function notifyCulto(Culto $culto, ?int $createdByUserId = null): ?AppNotification
    {
        $culto->refresh();

        if ($culto->published_at === null || $culto->published_at->isFuture()) {
            return null;
        }

        return $this->create(
            churchId: $culto->church_id,
            prefix: 'Novo culto: ',
            title: $culto->title,
            body: 'Toque para assistir na app.',
            actionUrl: route('mobile.culto.show', ['culto' => $culto->id], absolute: true),
            createdByUserId: $createdByUserId,
        );
    }

    public function notifyDonationCampaign(DonationCampaign $campaign, ?int $createdByUserId = null): ?AppNotification
    {
        $campaign->refresh();

        if ($campaign->status === DonationCampaign::STATUS_ARCHIVED) {
            return null;
        }

        return $this->create(
            churchId: $campaign->church_id,
            prefix: 'Nova campanha da Oferta Nova Semente: ',
            title: $campaign->title,
            body: $this->bodyFromText($campaign->description),
            actionUrl: route('mobile.campaigns.show', ['donationCampaign' => $campaign->id], absolute: true),
            createdByUserId: $createdByUserId,
        );
    }

    public function notifyCharityCampaign(CharityCampaign $campaign, ?int $createdByUserId = null): ?AppNotification
    {
        $campaign->refresh();

        if ($campaign->status === CharityCampaign::STATUS_ARCHIVED) {
            return null;
        }

        return $this->create(
            churchId: $campaign->church_id,
            prefix: $campaign->isItemCampaign() ? 'Nova campanha de doação de objetos: ' : 'Nova campanha de doação: ',
            title: $campaign->title,
            body: $this->bodyFromText($campaign->description),
            actionUrl: route('mobile.donations.show', ['charityCampaign' => $campaign->id], absolute: true),
            createdByUserId: $createdByUserId,
        );
    }

    public function notifyPoll(\App\Models\Poll $poll, ?int $createdByUserId = null): ?AppNotification
    {
        $poll->refresh();

        if ($poll->status !== \App\Models\Poll::STATUS_OPEN) {
            return null;
        }

        if (! $poll->publish_to_feed) {
            return null;
        }

        return $this->create(
            churchId: $poll->church_id,
            prefix: 'Nova enquete: ',
            title: $poll->question,
            body: $poll->isTextResponse()
                ? 'Escreva sua resposta na app.'
                : 'Vote e veja o resultado da congregação.',
            actionUrl: route('mobile.polls.show', ['poll' => $poll->id], absolute: true),
            createdByUserId: $createdByUserId,
        );
    }

    private function create(
        ?int $churchId,
        string $prefix,
        string $title,
        string $body,
        string $actionUrl,
        ?int $createdByUserId,
    ): AppNotification {
        return AppNotification::create([
            'church_id' => $churchId,
            'title' => Str::limit($prefix.$title, 255),
            'body' => Str::limit($body, 5000),
            'action_url' => $actionUrl,
            'created_by' => $createdByUserId,
        ]);
    }

    private function bodyFromText(?string $primary, ?string $fallback = null): string
    {
        $text = trim((string) $primary);
        if ($text === '') {
            $plain = trim(preg_replace('/\s+/u', ' ', strip_tags((string) ($fallback ?? ''))) ?? '');
            $text = $plain;
        }

        return $text !== '' ? Str::limit($text, 240) : 'Toque para abrir na app.';
    }
}
