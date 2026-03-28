<?php

namespace App\Services;

use App\Http\Controllers\MobileChurchSolicitationController;
use App\Mail\SolicitationStaffMessageMail;
use App\Models\ChurchSolicitation;
use App\Models\Member;
use App\Models\User;
use App\Models\UserInboxNotification;
use Illuminate\Support\Facades\Mail;

class SolicitationChatNotifier
{
    /** Aviso ao membro quando a igreja (staff) envia uma mensagem no chat. */
    public function notifyMemberOfStaffMessage(ChurchSolicitation $solicitation, User $staff, string $messageContent): void
    {
        $owner = User::query()->find($solicitation->user_id);
        if (! $owner || (int) $owner->id === (int) $staff->id) {
            return;
        }

        $typeLabel = MobileChurchSolicitationController::typeLabel($solicitation->type);
        $title = 'Nova mensagem da igreja';
        $body = 'Sobre o seu pedido: '.$typeLabel.'.';

        $row = UserInboxNotification::create([
            'user_id' => $owner->id,
            'title' => $title,
            'body' => $body,
            'action_url' => null,
        ]);

        $conversationUrl = route('mobile.solicitations.show', [
            'solicitation' => $solicitation->id,
            'inbox' => $row->id,
        ], absolute: true);

        $row->update([
            'action_url' => $conversationUrl,
        ]);

        $email = $this->resolveMemberEmail($owner);
        if ($email !== null) {
            Mail::to($email)->send(new SolicitationStaffMessageMail(
                $typeLabel,
                $messageContent,
                $conversationUrl
            ));
        }
    }

    /** Aviso aos utilizadores com acesso à inbox quando o membro responde. */
    public function notifyStaffOfMemberMessage(ChurchSolicitation $solicitation, User $member): void
    {
        $typeLabel = MobileChurchSolicitationController::typeLabel($solicitation->type);
        $title = 'Nova mensagem num pedido';
        $body = $member->name.' respondeu sobre: '.$typeLabel.'.';

        $staffUsers = User::query()
            ->permission(['solicitations.view', 'solicitations.manage'])
            ->where('id', '!=', $member->id)
            ->get();

        foreach ($staffUsers as $user) {
            $row = UserInboxNotification::create([
                'user_id' => $user->id,
                'title' => $title,
                'body' => $body,
                'action_url' => null,
            ]);

            $row->update([
                'action_url' => route('solicitations.index', [
                    'modal' => $solicitation->id,
                    'inbox' => $row->id,
                ], absolute: true),
            ]);
        }
    }

    private function resolveMemberEmail(User $owner): ?string
    {
        if ($owner->email && filter_var($owner->email, FILTER_VALIDATE_EMAIL)) {
            return $owner->email;
        }

        if ($owner->member_id) {
            $member = Member::query()->find($owner->member_id);
            if ($member?->email && filter_var($member->email, FILTER_VALIDATE_EMAIL)) {
                return $member->email;
            }
        }

        return null;
    }
}
