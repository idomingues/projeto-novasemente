/** Texto normalizado para comparação de busca (sem acentos, minúsculas). */
export function normalizeForSearch(value: string): string {
    return value
        .trim()
        .toLocaleLowerCase('pt-BR')
        .normalize('NFD')
        .replace(/\p{M}/gu, '');
}

/** Verifica se `haystack` contém `query` ignorando acentos e maiúsculas. */
export function textIncludesSearch(haystack: string, query: string): boolean {
    const needle = normalizeForSearch(query);
    if (needle === '') {
        return true;
    }
    return normalizeForSearch(haystack).includes(needle);
}

/** Busca em vários campos concatenados (nome, e-mail, telefone, etc.). */
export function textMatchesSearchFields(
    query: string,
    ...fields: Array<string | null | undefined>
): boolean {
    const needle = normalizeForSearch(query);
    if (needle === '') {
        return true;
    }
    const haystack = fields
        .filter((part): part is string => part != null && String(part).trim() !== '')
        .map((part) => normalizeForSearch(String(part)))
        .join(' ');
    return haystack.includes(needle);
}
