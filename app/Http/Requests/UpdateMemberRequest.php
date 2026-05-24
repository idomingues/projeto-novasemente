<?php

namespace App\Http\Requests;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Support\MemberRoleAssignment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Parâmetro da rota: `members/{user}` (routes: ->parameters(['members' => 'user'])).
        $user = $this->route('user');
        $merge = [
            'is_volunteer' => $this->boolean('is_volunteer'),
            'is_ministry_leader' => $this->boolean('is_ministry_leader'),
            'notify_via_app' => $this->boolean('notify_via_app'),
            'notify_via_email' => $this->boolean('notify_via_email'),
            'notify_via_whatsapp' => $this->boolean('notify_via_whatsapp'),
        ];
        if ($user instanceof User && $user->lgpd_accepted_at !== null) {
            $merge['lgpd_accepted'] = true;
        } elseif ($user instanceof User && $user->lgpd_accepted_at === null && $this->user()?->can('members.manage')) {
            // Quem gere membros actualiza dados em nome da igreja; não exigir novo clique LGPD em cada edição
            // (evita erro «lgpd accepted» quando o checkbox não vai no multipart ou o usuário nunca abriu o fluxo da app).
            $merge['lgpd_accepted'] = true;
        }
        $this->merge($merge);
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->route('user');
        $memberId = $user instanceof User ? $user->id : null;

        $churchId = Church::resolveWorkingId($this);
        $ministryItemRules = ['integer'];
        if ($churchId !== null) {
            $ministryItemRules[] = Rule::exists('ministries', 'id')->where('church_id', $churchId);
        } else {
            $ministryItemRules[] = 'prohibited';
        }

        $assignable = MemberRoleAssignment::assignableRoleNames($this->user());
        $roleRules = ['nullable', 'string'];
        if ($assignable !== []) {
            $roleRules[] = Rule::in($assignable);
        }

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($memberId),
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'birth_date' => ['nullable', 'date'],
            'address' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', 'in:active,inactive'],
            'is_volunteer' => ['sometimes', 'boolean'],
            'is_ministry_leader' => ['sometimes', 'boolean'],
            'volunteer_ministry_ids' => ['nullable', 'array'],
            'volunteer_ministry_ids.*' => $ministryItemRules,
            'app_ministry_ids' => ['nullable', 'array'],
            'app_ministry_ids.*' => $ministryItemRules,
            'photo' => ['nullable', 'image', 'max:4096'],
            'notify_via_app' => ['sometimes', 'boolean'],
            'notify_via_email' => ['sometimes', 'boolean'],
            'notify_via_whatsapp' => ['sometimes', 'boolean'],
            'lgpd_accepted' => [
                Rule::requiredIf(function (): bool {
                    $target = $this->route('user');

                    return $target instanceof User && $target->lgpd_accepted_at === null;
                }),
                'accepted',
            ],
            'role_name' => $roleRules,
            'password' => [
                Rule::excludeIf(fn () => ! ($this->user()?->can('members.manage') || $this->user()?->can('users.manage'))),
                'nullable',
                'string',
                'confirmed',
                Password::defaults(),
            ],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $target = $this->route('user');
            $roleFromForm = $this->input('role_name');
            $roleFromTarget = $target instanceof User ? $target->getRoleNames()->first() : null;
            $targetRole = is_string($roleFromForm) && trim($roleFromForm) !== '' ? trim($roleFromForm) : (is_string($roleFromTarget) ? $roleFromTarget : null);
            $isAdminLikeTarget = in_array($targetRole, ['admin', 'super_admin'], true);

            // Admin/super_admin não precisam estar vinculados a departamentos (regra de negócio).
            if ($isAdminLikeTarget) {
                return;
            }

            // Líder (checkbox): precisa escolher ao menos um departamento para ver “Meus voluntários”.
            if ($this->boolean('is_ministry_leader')) {
                $cid = Church::resolveWorkingId($this);
                if ($cid !== null && Ministry::query()->where('church_id', $cid)->exists()) {
                    $ids = $this->input('app_ministry_ids', []);
                    $n = is_array($ids) ? count(array_filter($ids, fn ($v) => (int) $v > 0)) : 0;
                    if ($n < 1) {
                        $validator->errors()->add('app_ministry_ids', 'Selecione pelo menos um departamento que o líder irá gerir.');
                    }
                }
            }

            if (! $this->boolean('is_volunteer')) {
                return;
            }
            $cid = Church::resolveWorkingId($this);
            if ($cid === null || ! Ministry::query()->where('church_id', $cid)->exists()) {
                return;
            }
            $ids = $this->input('volunteer_ministry_ids', []);
            $n = is_array($ids) ? count(array_filter($ids, fn ($v) => (int) $v > 0)) : 0;
            if ($n < 1) {
                $validator->errors()->add(
                    'volunteer_ministry_ids',
                    'Selecione pelo menos um departamento em que serve ou irá servir.'
                );
            }
        });
    }
}
