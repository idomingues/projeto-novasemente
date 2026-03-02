<?php

namespace App\Domain\Members\Actions;

use App\Models\Member;

class CreateMember
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __invoke(array $data): Member
    {
        return Member::create($data);
    }
}

