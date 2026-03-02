<?php

namespace App\Domain\Members\Actions;

use App\Models\Member;

class UpdateMember
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __invoke(Member $member, array $data): Member
    {
        $member->update($data);

        return $member;
    }
}

