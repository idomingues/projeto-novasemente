<?php

namespace App\Services;

use App\Mail\TalentConnectionMemberMail;
use App\Mail\TalentListingPendingApprovalMail;
use App\Models\Church;
use App\Models\TalentInterest;
use App\Models\TalentListing;
use App\Models\TalentReport;
use App\Models\TalentReview;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Support\SafeSpatieUsersByPermission;
use App\Support\UserMessagingPreferences;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class TalentConnectionNotifier
{
    /** Nova ou reenviada para análise → moderadores e e-mail configurado. */
    public function notifyModeratorsOfPendingListing(TalentListing $listing): void
    {
        if ($listing->status !== TalentListing::STATUS_PENDING) {
            return;
        }

        $listing->loadMissing(['author:id,name', 'category:id,name', 'church:id,name']);
        $church = $listing->church;
        if (! $church instanceof Church) {
            return;
        }

        $authorName = $listing->author?->name ?? 'Um membro';
        $approvalUrl = route('talents.admin.listings', ['status' => TalentListing::STATUS_PENDING], absolute: true);
        $configuredEmail = trim((string) ($church->talents_moderator_notification_email ?? ''));
        $emailedAddresses = [];

        if ($configuredEmail !== '' && filter_var($configuredEmail, FILTER_VALIDATE_EMAIL)) {
            $this->sendModeratorApprovalEmail($listing, $authorName, $approvalUrl, $configuredEmail);
            $emailedAddresses[] = strtolower($configuredEmail);
        }

        $moderators = $this->moderatorsForChurch((int) $church->id, (int) $listing->user_id);

        if ($configuredEmail === '') {
            foreach ($moderators as $moderator) {
                $email = $this->resolveUserEmail($moderator);
                if ($email === null || in_array(strtolower($email), $emailedAddresses, true)) {
                    continue;
                }
                if (! UserMessagingPreferences::acceptsAccountEmail($moderator)) {
                    continue;
                }
                $this->sendModeratorApprovalEmail($listing, $authorName, $approvalUrl, $email);
                $emailedAddresses[] = strtolower($email);
            }
        }

        $title = 'Publicação aguardando aprovação';
        $body = $authorName.' enviou «'.$listing->title.'» na Central de Serviços.';

        foreach ($moderators as $moderator) {
            $this->pushPendingListingInbox($moderator, $listing, $title, $body);
        }
    }

    /** Aprovação, rejeição ou suspensão pela moderação → publicador. */
    public function notifyPublisherOfListingModeration(TalentListing $listing, string $decision): void
    {
        $listing->loadMissing(['author:id,name', 'category:id,name']);

        $publisher = $listing->author;
        if (! $publisher instanceof User) {
            return;
        }

        [$title, $intro, $detail] = match ($decision) {
            'approved' => [
                'Publicação aprovada',
                'Sua publicação «'.$listing->title.'» foi aprovada e já está visível na comunidade.',
                'Parabéns! Outros membros já podem encontrar seu talento ou serviço.',
            ],
            'rejected' => [
                'Publicação não aprovada',
                'Sua publicação «'.$listing->title.'» não foi aprovada neste momento.',
                $listing->rejection_reason
                    ? 'Motivo: '.$listing->rejection_reason
                    : 'Revise o conteúdo e, se fizer sentido, envie uma nova versão.',
            ],
            'suspended' => [
                'Publicação suspensa',
                'Sua publicação «'.$listing->title.'» foi suspensa pela equipe de moderação.',
                'Entre em contato com a igreja se precisar de mais informações.',
            ],
            default => [
                'Atualização na sua publicação',
                'Houve uma atualização em «'.$listing->title.'».',
                TalentListing::statusLabel($listing->status),
            ],
        };

        $this->notifyMember(
            $publisher,
            $title,
            $intro,
            'mobile.talents.my-listings',
            [],
            'Central de Serviços — '.$title,
            $intro,
            $detail,
            'Ver minhas publicações',
        );
    }

    /** Publicador pausou ou encerrou → interessados com conexão ativa. */
    public function notifyInterestedPartiesOfListingUnavailable(TalentListing $listing, string $reason): void
    {
        $listing->loadMissing(['author:id,name']);

        $interests = TalentInterest::query()
            ->with('user:id,name,email,notify_via_app,notify_via_email')
            ->where('listing_id', $listing->id)
            ->whereNotIn('status', [TalentInterest::STATUS_CANCELLED, TalentInterest::STATUS_COMPLETED])
            ->get();

        $intro = match ($reason) {
            'paused' => 'A publicação «'.$listing->title.'» foi pausada pelo autor.',
            'closed' => 'A publicação «'.$listing->title.'» foi encerrada pelo autor.',
            default => 'A publicação «'.$listing->title.'» não está mais disponível.',
        };

        foreach ($interests as $interest) {
            $user = $interest->user;
            if (! $user instanceof User) {
                continue;
            }

            $this->notifyMember(
                $user,
                'Atualização na Central de Serviços',
                $intro,
                'mobile.talents.my-interests',
                [],
                'Central de Serviços — atualização',
                $intro,
                'Status da sua conexão: '.TalentInterest::statusLabel($interest->status),
                'Ver meus interesses',
            );
        }
    }

    /** Novo interesse → publicador da publicação. */
    public function notifyPublisherOfNewInterest(TalentInterest $interest): void
    {
        $interest->loadMissing(['user:id,name', 'listing.author:id,name', 'listing:id,title,user_id']);

        $listing = $interest->listing;
        $publisher = $listing->author;
        $interested = $interest->user;

        if (! $publisher instanceof User || ! $interested instanceof User) {
            return;
        }

        if ((int) $publisher->id === (int) $interested->id) {
            return;
        }

        $detail = $interested->name.' demonstrou interesse na sua publicação «'.$listing->title.'».';
        if ($interest->message) {
            $detail .= "\n\nMensagem:\n".Str::limit(trim($interest->message), 500);
        }

        $this->notifyMember(
            $publisher,
            'Novo interesse na sua publicação',
            $interested->name.' quer se conectar com você.',
            'mobile.talents.my-interests',
            [],
            'Novo interesse — '.$listing->title,
            $interested->name.' demonstrou interesse na Central de Serviços.',
            $detail,
            'Ver interessados',
        );
    }

    /** Mudança de status da conexão → a outra parte (quem não alterou). */
    public function notifyCounterpartOfInterestStatusChange(TalentInterest $interest, User $actor): void
    {
        $interest->loadMissing(['user:id,name', 'listing.author:id,name', 'listing:id,title,user_id']);

        $listing = $interest->listing;
        $publisher = $listing->author;
        $interested = $interest->user;

        $recipient = (int) $actor->id === (int) $interested->id
            ? $publisher
            : $interested;

        if (! $recipient instanceof User || (int) $recipient->id === (int) $actor->id) {
            return;
        }

        $statusLabel = TalentInterest::statusLabel($interest->status);
        $actorName = $actor->name ?? 'Um membro';

        $this->notifyMember(
            $recipient,
            'Status da conexão atualizado',
            $actorName.' atualizou a conexão em «'.$listing->title.'» para: '.$statusLabel.'.',
            'mobile.talents.my-interests',
            [],
            'Central de Serviços — '.$statusLabel,
            $actorName.' atualizou o status da conexão.',
            'Publicação: '.$listing->title."\nNovo status: ".$statusLabel,
            'Ver conexão',
        );
    }

    /** Nova mensagem no chat da conexão → a outra parte. */
    public function notifyCounterpartOfInterestMessage(TalentInterest $interest, User $sender, string $messageBody): void
    {
        $interest->loadMissing(['user:id,name', 'listing.author:id,name', 'listing:id,title,user_id']);

        $listing = $interest->listing;
        $publisher = $listing->author;
        $interested = $interest->user;

        $recipient = (int) $sender->id === (int) $interested->id
            ? $publisher
            : $interested;

        if (! $recipient instanceof User || (int) $recipient->id === (int) $sender->id) {
            return;
        }

        $senderName = $sender->name ?? 'Um membro';
        $preview = Str::limit(trim($messageBody), 500);

        $this->notifyMember(
            $recipient,
            'Nova mensagem na conexão',
            $senderName.' enviou uma mensagem sobre «'.$listing->title.'».',
            'mobile.talents.my-interests',
            [],
            'Nova mensagem — Central de Serviços',
            $senderName.' escreveu na conversa da publicação «'.$listing->title.'».',
            $preview,
            'Responder na app',
        );
    }

    /** Avaliação registrada → quem foi avaliado. */
    public function notifyReviewedUserOfNewReview(TalentReview $review): void
    {
        $review->loadMissing([
            'reviewer:id,name',
            'reviewed:id,name',
            'listing:id,title',
        ]);

        $reviewed = $review->reviewed;
        $reviewer = $review->reviewer;

        if (! $reviewed instanceof User || ! $reviewer instanceof User) {
            return;
        }

        if ((int) $reviewed->id === (int) $reviewer->id) {
            return;
        }

        $stars = (int) $review->rating;
        $detail = 'Nota: '.$stars.' de 5 estrelas.';
        if ($review->comment) {
            $detail .= "\n\nComentário:\n".Str::limit(trim($review->comment), 500);
        }

        $this->notifyMember(
            $reviewed,
            'Você recebeu uma avaliação',
            $reviewer->name.' avaliou sua colaboração em «'.$review->listing?->title.'».',
            'mobile.talents.my-interests',
            [],
            'Nova avaliação na Central de Serviços',
            $reviewer->name.' deixou uma avaliação sobre a conexão.',
            $detail,
            'Ver na app',
        );
    }

    /** Denúncia nova → moderadores (+ tesoureiro se abuso comercial). */
    public function notifyModeratorsOfNewReport(TalentReport $report): void
    {
        $report->loadMissing([
            'reporter:id,name',
            'listing:id,title',
            'reportedUser:id,name',
            'church:id,name,talents_moderator_notification_email,treasurer_notification_email',
        ]);

        $church = $report->church;
        if (! $church instanceof Church) {
            return;
        }

        $reasonLabel = TalentReport::reasonLabel($report->reason);
        $reporterName = $report->reporter?->name ?? 'Um membro';
        $listingTitle = $report->listing?->title ?? 'Publicação';
        $body = $reporterName.' registrou uma denúncia («'.$reasonLabel.'») sobre «'.$listingTitle.'».';

        $reportsUrl = route('talents.admin.reports', absolute: true);
        $detail = $body;
        if ($report->description) {
            $detail .= "\n\nDetalhes:\n".Str::limit(trim($report->description), 500);
        }

        $configuredEmail = trim((string) ($church->talents_moderator_notification_email ?? ''));
        if ($configuredEmail !== '' && filter_var($configuredEmail, FILTER_VALIDATE_EMAIL)) {
            $this->sendMemberEmail(
                $configuredEmail,
                'Nova denúncia — Central de Serviços',
                'Denúncia para análise',
                $body,
                $detail,
                $reportsUrl,
                'Analisar denúncias',
            );
        }

        if ($report->reason === TalentReport::REASON_COMMERCIAL_ABUSE) {
            $treasurerEmail = trim((string) ($church->treasurer_notification_email ?? ''));
            if ($treasurerEmail !== ''
                && filter_var($treasurerEmail, FILTER_VALIDATE_EMAIL)
                && strcasecmp($treasurerEmail, $configuredEmail) !== 0) {
                $this->sendMemberEmail(
                    $treasurerEmail,
                    'Denúncia de abuso comercial — Central de Serviços',
                    'Aviso ao tesoureiro',
                    $body,
                    $detail,
                    route('talents.admin.dashboard', absolute: true),
                    'Abrir painel',
                );
            }
        }

        $moderators = $this->moderatorsForChurch((int) $church->id, (int) $report->reporter_user_id);
        foreach ($moderators as $moderator) {
            $this->pushInbox($moderator, 'Nova denúncia', $body, 'talents.admin.reports', []);
            if (UserMessagingPreferences::acceptsAccountEmail($moderator)) {
                $email = $this->resolveUserEmail($moderator);
                if ($email !== null && strcasecmp($email, $configuredEmail) !== 0) {
                    $this->sendMemberEmail(
                        $email,
                        'Nova denúncia — Central de Serviços',
                        'Denúncia para análise',
                        $body,
                        $detail,
                        $reportsUrl,
                        'Analisar denúncias',
                    );
                }
            }
        }
    }

    /** Denúncia resolvida → quem denunciou. */
    public function notifyReporterOfReportResolution(TalentReport $report): void
    {
        if (! in_array($report->status, [TalentReport::STATUS_RESOLVED, TalentReport::STATUS_DISMISSED], true)) {
            return;
        }

        $report->loadMissing(['reporter:id,name', 'listing:id,title']);

        $reporter = $report->reporter;
        if (! $reporter instanceof User) {
            return;
        }

        $statusLabel = TalentReport::statusLabel($report->status);
        $listingTitle = $report->listing?->title ?? 'a publicação';
        $intro = 'Sua denúncia sobre «'.$listingTitle.'» foi marcada como: '.$statusLabel.'.';

        $detail = $report->resolution_notes
            ? 'Observação da equipe: '.$report->resolution_notes
            : 'Obrigado por ajudar a cuidar da comunidade.';

        $this->notifyMember(
            $reporter,
            'Atualização na sua denúncia',
            $intro,
            'mobile.talents.index',
            [],
            'Central de Serviços — denúncia',
            $intro,
            $detail,
            'Abrir Central de Serviços',
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

        $actionUrl = route($routeName, $routeParams, absolute: true);
        $this->sendMemberEmail($email, $emailSubject, $inboxTitle, $emailIntro, $emailDetail, $actionUrl, $buttonLabel);
    }

    /**
     * Evita duplicar aviso de aprovação (ex.: double-submit) enquanto a publicação
     * segue pendente e o moderador ainda não leu a notificação anterior.
     */
    private function pushPendingListingInbox(User $user, TalentListing $listing, string $title, string $body): void
    {
        if (! UserMessagingPreferences::acceptsInbox($user)) {
            return;
        }

        $listingId = (int) $listing->id;
        $alreadyPending = UserInboxNotification::query()
            ->where('user_id', $user->id)
            ->where('title', $title)
            ->whereNull('read_at')
            ->where(function ($q) use ($listingId, $body) {
                $q->where('action_url', 'like', '%listing_id='.$listingId.'%')
                    ->orWhere('action_url', 'like', '%listing_id%3D'.$listingId.'%')
                    ->orWhere(function ($q2) use ($body) {
                        $q2->where('body', $body)
                            ->where('created_at', '>=', now()->subMinutes(5));
                    });
            })
            ->exists();

        if ($alreadyPending) {
            return;
        }

        $this->pushInbox(
            $user,
            $title,
            $body,
            'talents.admin.listings',
            [
                'status' => TalentListing::STATUS_PENDING,
                'listing_id' => $listingId,
            ],
        );
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

    private function sendMemberEmail(
        string $email,
        string $subject,
        string $headline,
        string $intro,
        string $detail,
        string $actionUrl,
        string $buttonLabel,
    ): void {
        try {
            Mail::to($email)->send(new TalentConnectionMemberMail(
                $subject,
                $headline,
                $intro,
                $detail,
                $actionUrl,
                $buttonLabel,
            ));
        } catch (\Throwable $e) {
            Log::warning('Falha ao enviar e-mail da Central de Serviços.', [
                'email' => $email,
                'subject' => $subject,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function sendModeratorApprovalEmail(
        TalentListing $listing,
        string $authorName,
        string $approvalUrl,
        string $email,
    ): void {
        try {
            Mail::to($email)->send(new TalentListingPendingApprovalMail($listing, $authorName, $approvalUrl));
        } catch (\Throwable $e) {
            Log::warning('Falha ao enviar e-mail de aprovação da Central de Serviços.', [
                'listing_id' => $listing->id,
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @return Collection<int, User>
     */
    private function moderatorsForChurch(int $churchId, int $excludeUserId): Collection
    {
        return SafeSpatieUsersByPermission::usersHavingAnyPermissionOrAdmins(
            ['talents.moderate'],
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
