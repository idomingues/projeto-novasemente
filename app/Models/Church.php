<?php

namespace App\Models;

use App\Support\StorageUrl;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\Request;

class Church extends Model
{
    /** URLs de referência CPB quando a igreja ainda não gravou links próprios em Configurações. */
    public const DEFAULT_LIBRARY_MEDITATION_URL = 'https://mais.cpb.com.br/meditacoes-diarias/';

    public const DEFAULT_LIBRARY_LESSON_URL = 'https://mais.cpb.com.br/licao/vida-de-oracao-2o-trimestre-2026/';

    protected $fillable = [
        'name',
        'slug',
        'logo_url',
        'city',
        'state',
        'country',
        'description',
        'ministry_invitation_intro',
        'mission_whatsapp_default_message',
        'active',
        'email',
        'phone',
        'whatsapp',
        'address',
        'pix_key',
        'donation_url',
        'treasurer_notification_email',
        'talents_moderator_notification_email',
        'disabled_app_features',
        'youtube_playlist_url',
        'youtube_live_url',
        'library_meditation_url',
        'library_lesson_url',
        'library_sunset_meditation_pdf_path',
        'library_sunset_meditation_segments',
        'library_sunset_meditation_year',
        'solicitations_handler_volunteer_id',
        'conversation_fallback_ministry_id',
        'conversation_reopen_days',
    ];

    protected $casts = [
        'active' => 'boolean',
        'disabled_app_features' => 'array',
        'library_sunset_meditation_segments' => 'array',
        'library_sunset_meditation_year' => 'integer',
    ];

    /** URL pública da logo (path local vira asset, URL externa mantida). */
    protected function logoUrl(): Attribute
    {
        return Attribute::make(
            get: fn (?string $value) => $value ? (str_starts_with($value, 'http') ? $value : StorageUrl::publicMediaUrl($value)) : null,
        );
    }

    public function services(): HasMany
    {
        return $this->hasMany(ChurchService::class)->orderBy('day_of_week')->orderBy('sort_order')->orderBy('start_time');
    }

    public function weeklyPrograms(): HasMany
    {
        return $this->hasMany(WeeklyProgram::class)->orderBy('sort_order')->orderBy('day_of_week');
    }

    public function pastors(): HasMany
    {
        return $this->hasMany(Pastor::class)->orderBy('sort_order')->orderBy('name');
    }

    public function solicitationsHandlerVolunteer(): BelongsTo
    {
        return $this->belongsTo(Volunteer::class, 'solicitations_handler_volunteer_id');
    }

    /**
     * Igreja ativa no painel: sessão "trabalhando em" ou primeira igreja ativa por nome.
     *
     * Após import de outro ambiente, `working_church_id` na sessão pode apontar para um id que já
     * não existe ou, com uma só igreja na BD, divergir do único registo — nesse caso os dados
     * (todos com outro church_id) deixam de aparecer. Por isso limpamos a sessão e tratamos o caso
     * de uma única igreja de forma determinística.
     */
    public static function resolveWorkingId(Request $request): ?int
    {
        $count = static::query()->count();
        if ($count === 0) {
            $request->session()->forget('working_church_id');

            return null;
        }

        if ($count === 1) {
            $soleId = (int) static::query()->orderBy('id')->value('id');
            if ((int) $request->session()->get('working_church_id') !== $soleId) {
                $request->session()->forget('working_church_id');
            }

            return $soleId;
        }

        $workingChurchId = $request->session()->get('working_church_id');
        if ($workingChurchId && ! static::query()->whereKey($workingChurchId)->exists()) {
            $request->session()->forget('working_church_id');
            $workingChurchId = null;
        }

        if ($workingChurchId) {
            $church = static::where('id', $workingChurchId)->where('active', true)->first();
            if ($church) {
                return (int) $church->id;
            }
        }

        $activeId = static::where('active', true)->orderBy('name')->value('id');
        if ($activeId) {
            return (int) $activeId;
        }

        // Fallback: se nenhuma igreja estiver marcada como ativa, usa a primeira cadastrada.
        $anyId = static::orderBy('id')->value('id');

        return $anyId ? (int) $anyId : null;
    }

    public function resolvedLibraryMeditationUrl(): string
    {
        $v = trim((string) ($this->library_meditation_url ?? ''));

        return $v !== '' ? $v : self::DEFAULT_LIBRARY_MEDITATION_URL;
    }

    /**
     * URL do devocional por público (Adulto / Mulher / Jovem).
     * Adultos respeitam o link configurado na igreja; Mulheres e Jovens usam as landings CPB.
     */
    public function resolvedLibraryMeditationUrlForAudience(?string $audience = null): string
    {
        $audience = \App\Support\DevotionalAudience::normalize($audience);
        if ($audience === \App\Support\DevotionalAudience::ADULTOS) {
            return $this->resolvedLibraryMeditationUrl();
        }

        return \App\Support\DevotionalAudience::defaultUrl($audience);
    }

    public function resolvedLibraryLessonUrl(): string
    {
        $v = trim((string) ($this->library_lesson_url ?? ''));

        return $v !== '' ? $v : self::DEFAULT_LIBRARY_LESSON_URL;
    }

    public function hasLibrarySunsetMeditation(): bool
    {
        $path = trim((string) ($this->library_sunset_meditation_pdf_path ?? ''));
        $segments = $this->library_sunset_meditation_segments;

        return $path !== '' && is_array($segments) && $segments !== [];
    }

    public function resolvedLibrarySunsetMeditationPdfUrl(): ?string
    {
        $path = trim((string) ($this->library_sunset_meditation_pdf_path ?? ''));
        if ($path === '') {
            return null;
        }

        return StorageUrl::publicMediaUrl($path);
    }
}
