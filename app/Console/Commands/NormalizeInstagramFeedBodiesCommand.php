<?php

namespace App\Console\Commands;

use App\Models\News;
use Illuminate\Console\Command;

class NormalizeInstagramFeedBodiesCommand extends Command
{
    protected $signature = 'news:normalize-feed-bodies';

    protected $description = 'Normaliza quebras de linha nas legendas dos posts Feed Instagram (pt-BR / parágrafos).';

    public function handle(): int
    {
        $count = 0;

        News::query()
            ->where('content_type', News::TYPE_INSTAGRAM_FEED)
            ->orderBy('id')
            ->each(function (News $news) use (&$count) {
                $body = (string) ($news->body ?? '');
                $normalized = trim(str_replace(["\r\n", "\r"], "\n", $body));
                $lines = array_map(
                    static fn (string $line) => rtrim(preg_replace('/[^\S\n]+/u', ' ', $line) ?? $line),
                    explode("\n", $normalized),
                );
                $normalized = trim(implode("\n", $lines));

                $dirty = $body !== $normalized || $news->excerpt !== null;

                if ($dirty) {
                    $news->update([
                        'body' => $normalized,
                        'excerpt' => null,
                    ]);
                    $count++;
                    $this->line("Atualizado #{$news->id}: {$news->title}");
                }
            });

        $this->info("Concluído. {$count} publicação(ões) ajustada(s).");

        return self::SUCCESS;
    }
}
