<?php

namespace App\Services;

use App\Mail\SharedTalentMemberMail;
use App\Models\SharedTalentEnrollment;
use App\Models\SharedTalentListing;
use App\Models\SharedTalentReport;
use App\Models\SharedTalentReview;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Support\SafeSpatieUsersByPermission;
use App\Support\SharedTalentEnrollmentStatus;
use App\Support\UserMessagingPreferences;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class SharedTalentNotifier
{
    public function notifyModeratorsOfPendingListing(SharedTalentListing $listing): void
    {
        if ($listing->status !== SharedTalentListing::STATUS_PENDING) {
            return;
        }

        $listing->loadMissing(['author:id,name', 'category:id,name']);
        $authorName = $listing->author?->name ?? 'Um membro';

        foreach ($this->moderatorsForChurch((int) $listing->church_id, (int) $listing->user_id) as $moderator) {
            $this->pushInbox(
                $moderator,
                'Talento aguardando aprovação',
                $authorName.' compartilhou «'.$listing->title.'» no Doar Talentos.',
                'shared-talents.admin.listings',
                ['status' => SharedTalentListing::STATUS_PENDING],
            );
        }
    }

    public function notifyPublisherOfListingModeration(SharedTalentListing $listing, string $decision): void
    {
        $listing->loadMissing(['author:id,name']);
        $publisher = $listing->author;
        if (! $publisher instanceof User) {
            return;
        }

        [$title, $intro, $detail] = match ($decision) {
            'approved' => [
                'Talento aprovado',
                'Sua publicação «'.$listing->title.'» foi aprovada e já está visível para a comunidade.',
                'Outros membros já podem se inscrever para aprender e crescer com você.',
            ],
            'rejected' => [
                'Talento não aprovado',
                'Sua publicação «'.$listing->title.'» não foi aprovada neste momento.',
                $listing->rejection_reason
                    ? 'Motivo: '.$listing->rejection_reason
                    : 'Revise o conteúdo e envie uma nova versão, se fizer sentido.',
            ],
            'suspended' => [
                'Talento suspenso',
                'Sua publicação «'.$listing->title.'» foi suspensa pela equipe de moderação.',
                'Entre em contato com a igreja se precisar de mais informações.',
            ],
            default => [
                'Atualização na sua publicação',
                'Houve uma atualização em «'.$listing->title.'».',
                SharedTalentListing::statusLabel($listing->status),
            ],
        };

        $this->notifyMember(
            $publisher,
            $title,
            $intro,
            'mobile.shared-talents.my-listings',
            [],
            'Doar Talentos — '.$title,
            $intro,
            $detail,
            'Ver minhas publicações',
        );
    }

    public function notifyPublisherOfNewEnrollment(SharedTalentEnrollment $enrollment): void
    {
        $enrollment->loadMissing(['user:id,name', 'listing.author:id,name', 'listing:id,title,user_id']);
        $listing = $enrollment->listing;
        $publisher = $listing->author;
        $participant = $enrollment->user;

        if (! $publisher instanceof User || ! $participant instanceof User) {
            return;
        }

        $detail = $participant->name.' quer participar de «'.$listing->title.'».';
        if ($enrollment->message) {
            $detail .= "\n\nMensagem:\n".Str::limit(trim($enrollment->message), 500);
        }

        $this->notifyMember(
            $publisher,
            'Nova inscrição',
            $participant->name.' solicitou participar do seu talento compartilhado.',
            'mobile.shared-talents.enrollments',
            [],
            'Nova inscrição — '.$listing->title,
            $detail,
            $detail,
            'Ver participantes',
        );
    }

    public function notifyParticipantOfEnrollmentStatus(SharedTalentEnrollment $enrollment, User $actor): void
    {
        $enrollment->loadMissing(['user:id,name', 'listing:id,title,user_id', 'listing.author:id,name']);
        $participant = $enrollment->user;
        if (! $participant instanceof User || (int) $participant->id === (int) $actor->id) {
            return;
        }

        $statusLabel = SharedTalentEnrollment::statusLabel($enrollment->status);
        $this->notifyMember(
            $participant,
            'Atualização da inscrição',
            'Sua inscrição em «'.$enrollment->listing->title.'» foi atualizada para: '.$statusLabel.'.',
            'mobile.shared-talents.my-enrollments',
            [],
            'Doar Talentos — '.$statusLabel,
            'O responsável atualizou sua participação.',
            'Publicação: '.$enrollment->listing->title."\nStatus: ".$statusLabel,
            'Ver minhas inscrições',
        );
    }

    public function notifyAnnouncementRecipients(SharedTalentListing $listing, string $body, User $publisher): void
    {
        $enrollments = SharedTalentEnrollment::query()
            ->with('user:id,name,email,notify_via_app,notify_via_email')
            ->where('listing_id', $listing->id)
            ->whereIn('status', SharedTalentEnrollmentStatus::announcementRecipients())
            ->get();

        foreach ($enrollments as $enrollment) {
            $user = $enrollment->user;
            if (! $user instanceof User || (int) $user->id === (int) $publisher->id) {
                continue;
            }

            $this->notifyMember(
                $user,
                'Comunicado — '.$listing->title,
                $publisher->name.' enviou um comunicado sobre o talento compartilhado.',
                'mobile.shared-talents.my-enrollments',
                [],
                'Comunicado — Doar Talentos',
                '«'.$listing->title.'»',
                Str::limit(trim($body), 800),
                'Ler na app',
            );
        }
    }

    public function notifyCounterpartOfMessage(SharedTalentEnrollment $enrollment, User $sender, string $messageBody): void
    {
        $enrollment->loadMissing(['user:id,name', 'listing.author:id,name', 'listing:id,title,user_id']);
        $recipient = (int) $sender->id === (int) $enrollment->user_id
            ? $enrollment->listing->author
            : $enrollment->user;

        if (! $recipient instanceof User || (int) $recipient->id === (int) $sender->id) {
            return;
        }

        $this->notifyMember(
            $recipient,
            'Nova mensagem',
            ($sender->name ?? 'Um membro').' enviou uma mensagem sobre «'.$enrollment->listing->title.'».',
            'mobile.shared-talents.my-enrollments',
            [],
            'Nova mensagem — Doar Talentos',
            Str::limit(trim($messageBody), 500),
            Str::limit(trim($messageBody), 500),
            'Responder na app',
        );
    }

    public function notifyReviewedUserOfNewReview(SharedTalentReview $review): void
    {
        $review->loadMissing(['reviewer:id,name', 'reviewedUser:id,name', 'listing:id,title']);
        $reviewed = $review->reviewedUser;
        $reviewer = $review->reviewer;

        if (! $reviewed instanceof User || ! $reviewer instanceof User || (int) $reviewed->id === (int) $reviewer->id) {
            return;
        }

        $detail = 'Nota: '.(int) $review->rating.' de 5 estrelas.';
        if ($review->comment) {
            $detail .= "\n\nComentário:\n".Str::limit(trim($review->comment), 500);
        }

        $this->notifyMember(
            $reviewed,
            'Você recebeu uma avaliação',
            $reviewer->name.' avaliou sua experiência em «'.$review->listing?->title.'».',
            'mobile.shared-talents.my-enrollments',
            [],
            'Nova avaliação — Doar Talentos',
            $detail,
            $detail,
            'Ver na app',
        );
    }

    public function notifyModeratorsOfNewReport(SharedTalentReport $report): void
    {
        $report->loadMissing(['reporter:id,name', 'listing:id,title', 'church:id,name']);
        $reasonLabel = SharedTalentReport::reasonLabel($report->reason);
        $body = ($report->reporter?->name ?? 'Um membro').' registrou uma denúncia («'.$reasonLabel.'»).';

        foreach ($this->moderatorsForChurch((int) $report->church_id, (int) $report->reporter_user_id) as $moderator) {
            $this->pushInbox(
                $moderator,
                'Nova denúncia — Doar Talentos',
                $body,
                'shared-talents.admin.reports',
                [],
            );
        }
    }

    public function notifyReporterOfReportResolution(SharedTalentReport $report): void
    {
        $report->loadMissing(['reporter:id,name']);
        $reporter = $report->reporter;
        if (! $reporter instanceof User) {
            return;
        }

        $this->notifyMember(
            $reporter,
            'Denúncia atualizada',
            'Sua denúncia foi analisada pela equipe.',
            'mobile.shared-talents.index',
            [],
            'Doar Talentos — denúncia',
            SharedTalentReport::statusLabel($report->status),
            $report->resolution_notes ?? 'Obrigado por ajudar a cuidar da comunidade.',
            'Abrir Doar Talentos',
        );
    }

    /**
     * @param  array<string, mixed>  $routeParams
     */
    private function notifyMember(
        User $user,
        string $inboxTitle,
        string $inboxBody,
        string $routeName,
        array $routeParams,
        string $emailSubject,
        string $emailIntro,
        string $emailDetail,
        string $buttonLabel,
    ): void {
        $this->pushInbox($user, $inboxTitle, $inboxBody, $routeName, $routeParams);

        if (! UserMessagingPreferences::acceptsAccountEmail($user)) {
            return;
        }

        $email = $this->resolveUserEmail($user);
        if ($email === null) {
            return;
        }

        try {
            Mail::to($email)->queue(new SharedTalentMemberMail(
                $emailSubject,
                $inboxTitle,
                $emailIntro,
                $emailDetail,
                route($routeName, $routeParams, absolute: true),
                $buttonLabel,
            ));
        } catch (\Throwable $e) {
            Log::warning('Falha ao enviar e-mail do Doar Talentos.', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $routeParams
     */
    private function pushInbox(User $user, string $title, string $body, string $routeName, array $routeParams): void
    {
        if (! UserMessagingPreferences::acceptsInbox($user)) {
            return;
        }

        $row = UserInboxNotification::create([
            'user_id' => $user->id,
            'title' => $title,
            'body' => $body,
            'action_url' => null,
        ]);

        $row->update([
            'action_url' => route($routeName, array_merge($routeParams, ['inbox' => $row->id]), absolute: true),
        ]);
    }

    /**
     * @return Collection<int, User>
     */
    private function moderatorsForChurch(int $churchId, int $excludeUserId): Collection
    {
        return SafeSpatieUsersByPermission::usersHavingAnyPermissionOrAdmins(
            ['shared_talents.moderate'],
            $excludeUserId,
        )->filter(function (User $user) use ($churchId) {
            if ($user->hasRole('super_admin')) {
                return true;
            }

            return (int) ($user->church_id ?? 0) === $churchId;
        })->values();
    }

    private function resolveUserEmail(User $user): ?string
    {
        if ($user->email && filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
            return $user->email;
        }

        return null;
    }
}
