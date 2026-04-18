<?php

namespace App\Support;

/**
 * Interpretação simples de frases em português para sugerir filtros na lista de voluntários.
 * (Sem chamadas a APIs externas — pode evoluir para LLM se configurado no futuro.)
 */
class VolunteerRosterAssistantHeuristics
{
    /**
     * @return array{reply: string, filters: array<string, string>}
     */
    public static function interpret(string $message): array
    {
        $m = mb_strtolower(trim($message));
        if ($m === '') {
            return [
                'reply' => 'Escreva o que procura (ex.: «membros oficiais», «últimos 7 dias», «com experiência em ministério»).',
                'filters' => [],
            ];
        }

        $filters = [];
        $hints = [];

        if (preg_match('/whatsapp|whats\\s*app|\\bzap\\b|tem whatsapp|com whatsapp/i', $m)) {
            $filters['has_whatsapp'] = '1';
            $hints[] = 'Indicaram WhatsApp.';
        }
        if (preg_match('/sem whatsapp|não tem whats|nao tem whats/i', $m)) {
            $filters['has_whatsapp'] = '0';
            $hints[] = 'Sem WhatsApp indicado.';
        }

        if (preg_match('/rede social|instagram|facebook|redes sociais/i', $m)) {
            $filters['has_social_networks'] = '1';
            $hints[] = 'Com redes sociais.';
        }

        if (preg_match('/membro oficial|membros oficiais|é membro|sou membro/i', $m)) {
            $filters['is_official_member'] = '1';
            $hints[] = 'Membros oficiais.';
        }
        if (preg_match('/não é membro|nao e membro|não membro|visitante/i', $m)) {
            $filters['is_official_member'] = '0';
            $hints[] = 'Não membros oficiais.';
        }

        if (preg_match('/já serviu|ja serviu|experiência anterior|experiencia anterior|serviu em ministério|serviu em ministerio/i', $m)) {
            $filters['has_previous_ministry_volunteer_experience'] = '1';
            $hints[] = 'Com experiência prévia em ministério.';
        }

        if (preg_match('/precisa de pastoral|orientação pastoral|pastoral/i', $m)) {
            $filters['needs_pastoral_guidance'] = '1';
            $hints[] = 'Pediram orientação pastoral.';
        }

        if (preg_match('/últimos\s*(\d+)\s*dias|ultimos\s*(\d+)\s*dias/iu', $m, $mm)) {
            $n = (int) ($mm[1] ?: $mm[2] ?: 0);
            if ($n > 0 && $n <= 365) {
                $filters['created_from'] = now()->subDays($n)->format('Y-m-d');
                $hints[] = "Cadastros dos últimos {$n} dias.";
            }
        }
        if (preg_match('/última semana|ultima semana|esta semana|hoje|novos cadastros|novos voluntários|novos voluntarios/i', $m)) {
            $filters['created_from'] = now()->subDays(7)->format('Y-m-d');
            $hints[] = 'Cadastros recentes (últimos 7 dias).';
        }

        if (preg_match('/ainda não (está|esta) (no|neste) ministério|fora do ministério|fora do ministerio|não (está|esta) no departamento|nao (está|esta) no departamento|sem departamento neste/i', $m)) {
            $filters['in_ministry'] = 'no';
            $hints[] = 'Ainda não associados a este ministério.';
        }
        if (preg_match('/já (está|esta) (no|neste) ministério|no departamento|neste departamento|só (os|as) (do|da) ministério|só neste/i', $m)) {
            $filters['in_ministry'] = 'yes';
            $hints[] = 'Já neste ministério.';
        }

        if (preg_match('/ativos|ativo/i', $m) && ! preg_match('/inativ/i', $m)) {
            $filters['active'] = '1';
            $hints[] = 'Voluntários ativos.';
        }
        if (preg_match('/inativos|inativo/i', $m)) {
            $filters['active'] = '0';
            $hints[] = 'Voluntários inativos.';
        }

        if (preg_match('/só app|somente app|acesso só na app|app_access/i', $m)) {
            $filters['app_access_only'] = '1';
            $hints[] = 'Marcados como acesso só app.';
        }

        // Texto livre: última linha ou frases entre aspas
        if (preg_match('/procurar por\\s*[«"](.+?)[»"]|interesse em\\s+(.+)|gosta de\\s+(.+)/iu', $message, $tm)) {
            $term = trim((string) ($tm[1] ?: $tm[2] ?: $tm[3] ?: ''));
            if ($term !== '' && mb_strlen($term) >= 2) {
                $filters['text_interest'] = $term;
                $hints[] = 'Pesquisa nos textos de interesse / dons.';
            }
        }

        if ($hints === []) {
            return [
                'reply' => 'Não identifiquei filtros concretos. Experimente: «últimos 14 dias», «membro oficial», «com experiência em ministério», «ainda não está neste ministério», ou escreva «procurar por música».',
                'filters' => [],
            ];
        }

        return [
            'reply' => implode(' ', $hints).' Aplicar na lista abaixo.',
            'filters' => $filters,
        ];
    }
}
