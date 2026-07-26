<?php

namespace App\Policies;

use App\Models\ChurchConversation;
use App\Models\ChurchConversationMessage;
use App\Models\User;
use App\Support\NsWhatsAccess;

class ChurchConversationPolicy
{
    public function viewAny(User $user): bool
    {
        return NsWhatsAccess::isModuleAdmin($user)
            || $user->isMinistryLeaderAccount();
    }

    public function view(User $user, ChurchConversation $conversation): bool
    {
        if ((int) $conversation->member_user_id === (int) $user->id) {
            return true;
        }

        return NsWhatsAccess::canViewAsStaff($user, $conversation);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function sendMessage(User $user, ChurchConversation $conversation): bool
    {
        if ((int) $conversation->member_user_id === (int) $user->id) {
            return true;
        }

        return NsWhatsAccess::canReplyAsStaff($user, $conversation);
    }

    public function claim(User $user, ChurchConversation $conversation): bool
    {
        if ($conversation->assignee_user_id !== null) {
            return false;
        }

        return NsWhatsAccess::canViewAsStaff($user, $conversation);
    }

    public function transfer(User $user, ChurchConversation $conversation): bool
    {
        if (NsWhatsAccess::isModuleAdmin($user)) {
            return true;
        }

        return (int) $conversation->assignee_user_id === (int) $user->id
            && NsWhatsAccess::leadsMinistry($user, (int) $conversation->current_ministry_id);
    }

    public function forward(User $user, ChurchConversation $conversation): bool
    {
        return $this->transfer($user, $conversation);
    }

    public function addInternalNote(User $user, ChurchConversation $conversation): bool
    {
        return NsWhatsAccess::canViewAsStaff($user, $conversation);
    }

    public function archive(User $user, ChurchConversation $conversation): bool
    {
        return $this->view($user, $conversation);
    }

    public function editMessage(User $user, ChurchConversationMessage $message): bool
    {
        if ((int) $message->author_user_id !== (int) $user->id) {
            return false;
        }

        if ($message->kind !== ChurchConversationMessage::KIND_PUBLIC) {
            return false;
        }

        $conversation = $message->conversation;
        if (! $conversation) {
            return false;
        }

        if ((int) $conversation->member_user_id !== (int) $user->id) {
            return false;
        }

        return ! $conversation->messages()
            ->where('kind', ChurchConversationMessage::KIND_PUBLIC)
            ->whereIn('author_role', ['leader', 'admin'])
            ->where('created_at', '>', $message->created_at)
            ->exists();
    }

    public function hideMessageForMember(User $user, ChurchConversationMessage $message): bool
    {
        $conversation = $message->conversation;

        return $conversation !== null
            && (int) $conversation->member_user_id === (int) $user->id
            && $message->kind === ChurchConversationMessage::KIND_PUBLIC;
    }

    public function admin(User $user): bool
    {
        return NsWhatsAccess::isModuleAdmin($user);
    }
}
