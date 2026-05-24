<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppNotification extends Model
{
    protected $table = 'app_notifications';

    protected $fillable = [
        'church_id',
        'title',
        'body',
        'created_by',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Notificações recentes para exibir (igreja atual + globais). */
    public static function recentForChurch(
        ?int $churchId,
        int $limit = 50,
        ?\DateTimeInterface $visibleSince = null,
    ): \Illuminate\Support\Collection {
        return static::query()
            ->with('author')
            ->where(function ($q) use ($churchId) {
                $q->whereNull('church_id');
                if ($churchId !== null) {
                    $q->orWhere('church_id', $churchId);
                }
            })
            ->when($visibleSince !== null, fn ($q) => $q->where('created_at', '>=', $visibleSince))
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(fn (self $n) => [
                'id' => $n->id,
                'title' => $n->title,
                'body' => $n->body,
                'created_at' => $n->created_at->toIso8601String(),
                'author' => $n->author ? ['name' => $n->author->name] : null,
            ]);
    }
}
