<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RevistaAdventistaArticle extends Model
{
    public const SECTION_ARTIGOS = 'artigos';

    public const SECTION_BUSSOLA = 'bussola';

    public const SECTION_EDITORIAL = 'editorial';

    public const SECTION_EM_FAMILIA = 'em_familia';

    protected $fillable = [
        'wp_post_id',
        'title',
        'slug',
        'excerpt',
        'body',
        'author_name',
        'source_url',
        'image_url',
        'section',
        'is_active',
        'published_at',
        'wp_modified_at',
        'synced_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'wp_modified_at' => 'datetime',
        'synced_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * @return array<string, string>
     */
    public static function sectionLabels(): array
    {
        return [
            self::SECTION_ARTIGOS => 'Artigos',
            self::SECTION_BUSSOLA => 'Bússola',
            self::SECTION_EDITORIAL => 'Editorial',
            self::SECTION_EM_FAMILIA => 'Em família',
        ];
    }

    public function sectionLabel(): string
    {
        return self::sectionLabels()[$this->section] ?? $this->section;
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<self>  $query
     * @return \Illuminate\Database\Eloquent\Builder<self>
     */
    public function scopeSearch($query, string $term)
    {
        $term = trim($term);
        if ($term === '') {
            return $query;
        }

        $like = '%'.$term.'%';

        return $query->where(function ($q) use ($like) {
            $q->where('title', 'like', $like)
                ->orWhere('excerpt', 'like', $like)
                ->orWhere('body', 'like', $like)
                ->orWhere('author_name', 'like', $like);
        });
    }
}
