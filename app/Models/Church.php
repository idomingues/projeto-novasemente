<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\Request;

class Church extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'logo_url',
        'city',
        'state',
        'country',
        'description',
        'active',
        'email',
        'phone',
        'whatsapp',
        'address',
        'pix_key',
        'donation_url',
        'youtube_playlist_url',
        'solicitations_handler_volunteer_id',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    /** URL pública da logo (path local vira asset, URL externa mantida). */
    protected function logoUrl(): Attribute
    {
        return Attribute::make(
            get: fn (?string $value) => $value ? (str_starts_with($value, 'http') ? $value : asset('storage/'.$value)) : null,
        );
    }

    public function services(): HasMany
    {
        return $this->hasMany(ChurchService::class)->orderBy('day_of_week')->orderBy('sort_order')->orderBy('start_time');
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
     */
    public static function resolveWorkingId(Request $request): ?int
    {
        $workingChurchId = $request->session()->get('working_church_id');
        if ($workingChurchId) {
            $church = static::where('id', $workingChurchId)->where('active', true)->first();
            if ($church) {
                return (int) $church->id;
            }
        }

        return static::where('active', true)->orderBy('name')->value('id');
    }
}
