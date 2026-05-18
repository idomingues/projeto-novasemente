<?php

namespace App\Support;

use App\Models\ChurchSolicitation;
use Illuminate\Support\Str;

class CommunicationRequestOptions
{
    /** @var array<string, string> */
    public const DEMAND_TYPES = [
        'promotion_post' => 'Divulgação/Postagem',
        'art_creation' => 'Criação de arte',
        'programming_coverage' => 'Cobertura de programação',
        'programming_insert' => 'Inserção na programação/culto',
        'technical_team' => 'Solicitação de equipe técnica',
    ];

    /** Tipos legados (formulário antigo) — só exibição. */
    private const LEGACY_DEMAND_TYPES = [
        'design' => 'Criação de artes',
        'posts_ads' => 'Postagens e anúncios',
        'programming_tasks' => 'Tarefas na programação',
        'team_scheduling' => 'Agendamento de equipe',
        'ns_structure' => 'Estrutura da NS',
        'other' => 'Outros',
    ];

    /** @var array<string, string> */
    public const PRIORITIES = [
        'low' => 'Baixa',
        'medium' => 'Média',
        'high' => 'Alta',
        'urgent' => 'Urgente',
    ];

    /** @var array<string, string> */
    public const ART_CHANNELS = [
        'instagram_story' => 'Story Instagram',
        'instagram_feed' => 'Feed Instagram',
        'reels_video' => 'Reels/Vídeo',
        'led_screen' => 'Telão de LED',
        'reception_tv' => 'TV da Recepção',
        'slide_presentation' => 'Slide/Apresentação',
        'printed_sign' => 'Placa impressa',
        'banner_print' => 'Banner/Gráfica',
        'whatsapp' => 'WhatsApp',
        'youtube_thumb' => 'YouTube/Thumb',
    ];

    /** @var array<string, string> */
    public const COVERAGE_SUPPORT = [
        'stories' => 'Stories',
        'photo' => 'Foto',
        'recording_stream' => 'Gravação/transmissão',
        'audio' => 'Áudio',
        'lighting' => 'Iluminação',
        'led' => 'LED',
        'general_ops' => 'Operação geral',
    ];

    public static function demandTypeLabel(string $value): string
    {
        return self::DEMAND_TYPES[$value]
            ?? self::LEGACY_DEMAND_TYPES[$value]
            ?? $value;
    }

    public static function priorityLabel(string $value): string
    {
        return self::PRIORITIES[$value] ?? $value;
    }

    /**
     * @param  list<string>  $keys
     * @param  array<string, string>  $catalog
     * @return list<string>
     */
    public static function labelsForKeys(array $keys, array $catalog): array
    {
        $out = [];
        foreach ($keys as $key) {
            if (isset($catalog[$key])) {
                $out[] = $catalog[$key];
            }
        }

        return $out;
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function toSelectOptions(array $catalog): array
    {
        return collect($catalog)
            ->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array{
     *   demand_type: string,
     *   priority: string,
     *   preferred_date: string|null,
     *   event_date: string|null,
     *   ministry_name: string|null,
     *   message: string,
     *   subject: string,
     *   meta: array<string, mixed>
     * }
     */
    public static function validatedPayload(array $input): array
    {
        $demandType = (string) $input['demand_type'];
        $priority = (string) $input['priority'];
        $message = trim((string) $input['message']);
        $eventDate = self::nullableDate($input['event_date'] ?? null);
        $preferredDate = self::nullableDate($input['preferred_date'] ?? null);
        $ministryName = self::nullableString($input['ministry_name'] ?? null, 120);

        $meta = [
            'communication_demand_type' => $demandType,
            'communication_priority' => $priority,
            'communication_event_date' => $eventDate,
            'communication_ministry_name' => $ministryName,
        ];

        if ($demandType === 'art_creation') {
            $meta['communication_art_channels'] = self::filterKeys(
                $input['art_channels'] ?? [],
                array_keys(self::ART_CHANNELS),
            );
        }

        if ($demandType === 'programming_coverage') {
            $meta['communication_coverage_event'] = self::nullableString($input['coverage_event'] ?? null, 200);
            $meta['communication_coverage_support'] = self::filterKeys(
                $input['coverage_support'] ?? [],
                array_keys(self::COVERAGE_SUPPORT),
            );
        }

        if ($demandType === 'technical_team') {
            $meta['communication_technical_event'] = self::nullableString($input['technical_event'] ?? null, 200);
            $meta['communication_technical_support'] = self::filterKeys(
                $input['technical_support'] ?? [],
                array_keys(self::COVERAGE_SUPPORT),
            );
        }

        return [
            'demand_type' => $demandType,
            'priority' => $priority,
            'preferred_date' => $preferredDate,
            'event_date' => $eventDate,
            'ministry_name' => $ministryName,
            'message' => $message,
            'subject' => 'Comunicação — '.self::demandTypeLabel($demandType),
            'meta' => $meta,
        ];
    }

    /**
     * @return array<string, array<int, string>>
     */
    public static function validationRules(): array
    {
        $demandKeys = implode(',', array_keys(self::DEMAND_TYPES));
        $priorityKeys = implode(',', array_keys(self::PRIORITIES));
        $artKeys = implode(',', array_keys(self::ART_CHANNELS));
        $supportKeys = implode(',', array_keys(self::COVERAGE_SUPPORT));

        return [
            'demand_type' => ['required', 'in:'.$demandKeys],
            'priority' => ['required', 'in:'.$priorityKeys],
            'preferred_date' => ['nullable', 'date'],
            'event_date' => ['nullable', 'date'],
            'ministry_name' => ['nullable', 'string', 'max:120'],
            'message' => ['required', 'string', 'max:5000'],
            'art_channels' => ['nullable', 'array'],
            'art_channels.*' => ['string', 'in:'.$artKeys],
            'coverage_event' => ['nullable', 'string', 'max:200'],
            'coverage_support' => ['nullable', 'array'],
            'coverage_support.*' => ['string', 'in:'.$supportKeys],
            'technical_event' => ['nullable', 'string', 'max:200'],
            'technical_support' => ['nullable', 'array'],
            'technical_support.*' => ['string', 'in:'.$supportKeys],
            'attachment_files' => ['nullable', 'array', 'max:'.config('communication.max_attachments', 8)],
            'attachment_files.*' => [
                'file',
                'max:'.config('communication.max_attachment_kb', 10240),
                'mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip',
            ],
        ];
    }

    /**
     * @param  array<string, mixed>|null  $meta
     * @return list<array{path: string, name: string, url: string}>
     */
    public static function attachmentRowsForDisplay(?array $meta): array
    {
        $raw = $meta['communication_attachments'] ?? [];
        if (! is_array($raw)) {
            return [];
        }

        $rows = [];
        foreach ($raw as $item) {
            if (! is_array($item)) {
                continue;
            }
            $path = (string) ($item['path'] ?? '');
            if ($path === '') {
                continue;
            }
            $rows[] = [
                'path' => $path,
                'name' => (string) ($item['name'] ?? basename($path)),
                'url' => StorageUrl::publicMediaUrl($path),
            ];
        }

        return $rows;
    }

    /**
     * Resumo estruturado para o painel de detalhes.
     *
     * @param  array<string, mixed>|null  $meta
     * @return array<string, mixed>
     */
    public static function detailsForPanel(?array $meta): array
    {
        $meta = $meta ?? [];

        return [
            'demandTypeLabel' => self::demandTypeLabel((string) ($meta['communication_demand_type'] ?? '')),
            'priorityLabel' => self::priorityLabel((string) ($meta['communication_priority'] ?? 'medium')),
            'eventDate' => $meta['communication_event_date'] ?? null,
            'ministryName' => $meta['communication_ministry_name'] ?? null,
            'artChannelLabels' => self::labelsForKeys(
                is_array($meta['communication_art_channels'] ?? null) ? $meta['communication_art_channels'] : [],
                self::ART_CHANNELS,
            ),
            'coverageEvent' => $meta['communication_coverage_event'] ?? null,
            'coverageSupportLabels' => self::labelsForKeys(
                is_array($meta['communication_coverage_support'] ?? null) ? $meta['communication_coverage_support'] : [],
                self::COVERAGE_SUPPORT,
            ),
            'technicalEvent' => $meta['communication_technical_event'] ?? null,
            'technicalSupportLabels' => self::labelsForKeys(
                is_array($meta['communication_technical_support'] ?? null) ? $meta['communication_technical_support'] : [],
                self::COVERAGE_SUPPORT,
            ),
            'attachments' => self::attachmentRowsForDisplay($meta),
        ];
    }

    public static function emailPreview(ChurchSolicitation $solicitation): string
    {
        $meta = $solicitation->meta ?? [];
        $lines = [];
        $lines[] = 'Tipo: '.self::demandTypeLabel((string) ($meta['communication_demand_type'] ?? ''));
        $lines[] = 'Prioridade: '.self::priorityLabel((string) ($meta['communication_priority'] ?? 'medium'));

        if ($solicitation->preferred_date) {
            $lines[] = 'Prazo desejado: '.$solicitation->preferred_date->format('d/m/Y');
        }

        $eventDate = $meta['communication_event_date'] ?? null;
        if (is_string($eventDate) && $eventDate !== '') {
            $lines[] = 'Data do evento/programação: '.$eventDate;
        }

        $ministry = $meta['communication_ministry_name'] ?? null;
        if (is_string($ministry) && trim($ministry) !== '') {
            $lines[] = 'Ministério/responsável: '.trim($ministry);
        }

        $artChannels = $meta['communication_art_channels'] ?? [];
        if (is_array($artChannels) && $artChannels !== []) {
            $lines[] = 'Canais: '.implode(', ', self::labelsForKeys($artChannels, self::ART_CHANNELS));
        }

        $coverageEvent = $meta['communication_coverage_event'] ?? null;
        if (is_string($coverageEvent) && trim($coverageEvent) !== '') {
            $lines[] = 'Programação/evento: '.trim($coverageEvent);
        }

        $coverageSupport = $meta['communication_coverage_support'] ?? [];
        if (is_array($coverageSupport) && $coverageSupport !== []) {
            $lines[] = 'Apoio (cobertura): '.implode(', ', self::labelsForKeys($coverageSupport, self::COVERAGE_SUPPORT));
        }

        $technicalEvent = $meta['communication_technical_event'] ?? null;
        if (is_string($technicalEvent) && trim($technicalEvent) !== '') {
            $lines[] = 'Programação/evento (técnica): '.trim($technicalEvent);
        }

        $technicalSupport = $meta['communication_technical_support'] ?? [];
        if (is_array($technicalSupport) && $technicalSupport !== []) {
            $lines[] = 'Apoio (equipe técnica): '.implode(', ', self::labelsForKeys($technicalSupport, self::COVERAGE_SUPPORT));
        }

        $attachments = self::attachmentRowsForDisplay($meta);
        if ($attachments !== []) {
            $lines[] = 'Anexos: '.count($attachments).' arquivo(s)';
        }

        $lines[] = '';
        $lines[] = trim((string) $solicitation->message);

        return Str::limit(implode("\n", $lines), 1200);
    }

    /**
     * @param  list<string>  $allowed
     * @return list<string>
     */
    private static function filterKeys(mixed $value, array $allowed): array
    {
        if (! is_array($value)) {
            return [];
        }

        $allowedFlip = array_flip($allowed);
        $out = [];
        foreach ($value as $item) {
            $key = (string) $item;
            if (isset($allowedFlip[$key]) && ! in_array($key, $out, true)) {
                $out[] = $key;
            }
        }

        return $out;
    }

    private static function nullableDate(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return trim($value);
    }

    private static function nullableString(mixed $value, int $max): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $trimmed = trim($value);

        return $trimmed === '' ? null : Str::limit($trimmed, $max, '');
    }
}
