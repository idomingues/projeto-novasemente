<?php

namespace App\Http\Requests;

use App\Models\Poll;
use Illuminate\Foundation\Http\FormRequest;

class StorePollVoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $poll = $this->route('poll');
        // Rotas: mobile.polls.vote {poll} | polls.vote.store {token}
        if (! $poll instanceof Poll) {
            $token = $this->route('token');
            if (is_string($token) && $token !== '') {
                $poll = Poll::query()->where('public_token', $token)->first();
            }
        }

        if ($poll instanceof Poll && $poll->isTextResponse()) {
            return [
                'answer_text' => ['required', 'string', 'max:'.Poll::TEXT_ANSWER_MAX],
            ];
        }

        return [
            'option_ids' => ['required', 'array', 'size:1'],
            'option_ids.*' => ['integer', 'distinct'],
        ];
    }

    public function messages(): array
    {
        return [
            'option_ids.required' => 'Selecione uma opção.',
            'option_ids.size' => 'Selecione apenas uma opção.',
            'answer_text.required' => 'Escreva sua sugestão.',
            'answer_text.max' => 'Use no máximo duas linhas curtas.',
        ];
    }
}
