<?php

namespace App\Domain\Volunteers\Actions;

use App\Models\Church;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DeleteVolunteer
{
    /**
     * Remove o cadastro de voluntário e dados ligados. Opcionalmente remove a conta de usuário.
     */
    public function __invoke(Volunteer $volunteer, bool $deleteLinkedUser = false): void
    {
        DB::transaction(function () use ($volunteer, $deleteLinkedUser) {
            $linkedUser = $volunteer->user_id
                ? User::query()->find($volunteer->user_id)
                : null;

            if (Schema::hasTable('churches')) {
                Church::query()
                    ->where('solicitations_handler_volunteer_id', $volunteer->id)
                    ->update(['solicitations_handler_volunteer_id' => null]);
            }

            if (Schema::hasTable('ministry_volunteer')) {
                $volunteer->ministries()->detach();
            }

            $volunteer->delete();

            if ($deleteLinkedUser && $linkedUser) {
                $linkedUser->delete();

                return;
            }

            if ($linkedUser) {
                $linkedUser->forceFill(['is_volunteer' => false])->save();
            }
        });
    }
}
