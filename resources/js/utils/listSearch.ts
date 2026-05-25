/** Mínimo de caracteres antes de consultar o servidor (evita busca na 1ª letra). */
export const LIST_SEARCH_MIN_LENGTH = 2;

/** Espera o usuário pausar a digitação antes de buscar no servidor. */
export const LIST_SEARCH_DEBOUNCE_MS = 450;

/**
 * Termo enviado ao servidor: vazio limpa o filtro; abaixo do mínimo não dispara busca.
 */
export function serverSearchTerm(input: string, minLength = LIST_SEARCH_MIN_LENGTH): string | undefined {
    const trimmed = input.trim();
    if (trimmed === '') {
        return undefined;
    }
    if (trimmed.length < minLength) {
        return undefined;
    }

    return trimmed;
}

/** Indica se o campo tem texto, mas ainda não atingiu o mínimo para buscar no servidor. */
export function isListSearchBelowMinimum(input: string, minLength = LIST_SEARCH_MIN_LENGTH): boolean {
    const trimmed = input.trim();
    return trimmed.length > 0 && trimmed.length < minLength;
}
