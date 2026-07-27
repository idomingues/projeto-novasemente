<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Poll extends Model
{
    use HasFactory;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_OPEN = 'open';

    public const STATUS_CLOSED = 'closed';

    public const STATUSES = [
        self::STATUS_DRAFT => 'Rascunho',
        self::STATUS_OPEN => 'Aberta',
        self::STATUS_CLOSED => 'Encerrada',
    ];

    public const DISPLAY_FONTS = [
        'sans' => 'Sem serifa',
        'serif' => 'Serifada',
        'display' => 'Display',
    ];

    public const DISPLAY_CHARTS = [
        'bar' => 'Barras',
        'column' => 'Colunas',
        'pie' => 'Pizza',
        'radial' => 'Anéis',
        'ranking' => 'Ranking',
        'waffle' => 'Grade',
    ];

    public const DISPLAY_LOGOS = [
        'none' => 'Sem logo',
        'horizontal-color' => 'Horizontal colorida',
        'horizontal-white' => 'Horizontal branca',
        'stacked-white' => 'Empilhada branca',
        'icon-green' => 'Ícone verde',
        'wordmark-white' => 'Só texto',
    ];

    public const RESPONSE_CHOICE = 'choice';

    public const RESPONSE_TEXT = 'text';

    public const RESPONSE_TYPES = [
        self::RESPONSE_CHOICE => 'Múltipla escolha',
        self::RESPONSE_TEXT => 'Texto livre',
    ];

    /** ~2 linhas curtas no celular. */
    public const TEXT_ANSWER_MAX = 160;

    /** Opção especial: digitação vira nova opção da enquete. */
    public const WRITE_IN_OPTION_LABEL = 'Outros (Escrever)';

    /** Nome curto digitado em «Outros». */
    public const WRITE_IN_TEXT_MAX = 60;

    /** Mínimo de caracteres em «Outros» (bloqueia «E», «A»; permite «Jó»). */
    public const WRITE_IN_TEXT_MIN = 2;

    public static function isWriteInLabel(?string $label): bool
    {
        if ($label === null || $label === '') {
            return false;
        }

        return mb_strtolower(trim($label)) === mb_strtolower(self::WRITE_IN_OPTION_LABEL);
    }

    public static function displayLogoPath(?string $key): ?string
    {
        if ($key === null || $key === '' || $key === 'none') {
            return null;
        }

        if (! array_key_exists($key, self::DISPLAY_LOGOS)) {
            return null;
        }

        return '/images/brand/enquete/'.$key.'.png';
    }

    protected $fillable = [
        'church_id',
        'created_by',
        'question',
        'allow_multiple',
        'response_type',
        'status',
        'public_token',
        'display_bg_color',
        'display_font',
        'display_chart',
        'display_logo',
        'display_enabled',
        'publish_to_feed',
    ];

    protected function casts(): array
    {
        return [
            'allow_multiple' => 'boolean',
            'display_enabled' => 'boolean',
            'publish_to_feed' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Poll $poll) {
            if (blank($poll->public_token)) {
                $poll->public_token = self::generatePublicToken();
            }
            if (blank($poll->response_type)) {
                $poll->response_type = self::RESPONSE_CHOICE;
            }
            if (blank($poll->display_bg_color)) {
                $poll->display_bg_color = '#0f172a';
            }
            if (blank($poll->display_font)) {
                $poll->display_font = 'sans';
            }
            if (blank($poll->display_chart)) {
                $poll->display_chart = 'bar';
            }
            if (blank($poll->display_logo)) {
                $poll->display_logo = 'horizontal-color';
            }
            if ($poll->display_enabled === null) {
                $poll->display_enabled = true;
            }
            if ($poll->publish_to_feed === null) {
                $poll->publish_to_feed = true;
            }
        });
    }

    public static function generatePublicToken(): string
    {
        return Str::random(40);
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function options(): HasMany
    {
        return $this->hasMany(PollOption::class)->orderBy('sort_order')->orderBy('id');
    }

    public function votes(): HasMany
    {
        return $this->hasMany(PollVote::class);
    }

    public function scopeForChurch(Builder $query, ?int $churchId): Builder
    {
        if ($churchId === null) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where('church_id', $churchId);
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_OPEN);
    }

    public function isOpen(): bool
    {
        return $this->status === self::STATUS_OPEN;
    }

    public function isTextResponse(): bool
    {
        return ($this->response_type ?: self::RESPONSE_CHOICE) === self::RESPONSE_TEXT;
    }

    public function showsResults(): bool
    {
        return ! $this->isTextResponse();
    }

    public function userHasVoted(?int $userId): bool
    {
        if ($userId === null) {
            return false;
        }

        return $this->votes()
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)
                    ->orWhere('voter_key', 'u:'.$userId);
            })
            ->exists();
    }

    public function ipHasVoted(string $ip): bool
    {
        if ($ip === '') {
            return false;
        }

        return $this->votes()
            ->where(function ($q) use ($ip) {
                $q->where('voter_ip', $ip)
                    ->orWhere('voter_key', 'ip:'.hash('sha256', $ip));
            })
            ->exists();
    }

    public function ensurePublicToken(): string
    {
        if (blank($this->public_token)) {
            $this->forceFill(['public_token' => self::generatePublicToken()])->save();
        }

        return (string) $this->public_token;
    }
}
