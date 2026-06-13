<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommunityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('communities.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:500'],
            'whatsapp_url' => ['required', 'string', 'max:512', 'regex:/^https:\/\/(chat\.whatsapp\.com|wa\.me|api\.whatsapp\.com)\//i'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_published' => ['boolean'],
            'cover_image_file' => ['nullable', 'image', 'max:4096'],
        ];
    }

    public function messages(): array
    {
        return [
            'whatsapp_url.regex' => 'Informe um link válido do WhatsApp (chat.whatsapp.com ou wa.me).',
            'cover_image_file.image' => 'A arte deve ser uma imagem (JPG, PNG ou WebP).',
            'cover_image_file.max' => 'A imagem da arte não pode passar de 4 MB.',
        ];
    }
}
