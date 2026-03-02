<?php

namespace App\Domain\Members\Actions;

use App\Models\Member;

class DeleteMember
{
    public function __invoke(Member $member): void
    {
        $member->delete();
    }
}

