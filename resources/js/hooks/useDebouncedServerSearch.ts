import {
    isListSearchBelowMinimum,
    LIST_SEARCH_DEBOUNCE_MS,
    LIST_SEARCH_MIN_LENGTH,
    serverSearchTerm,
} from '@/utils/listSearch';
import { useEffect, useState } from 'react';

type Options = {
    /** Valor já aplicado no servidor (ex.: filters.search). */
    serverValue?: string;
    debounceMs?: number;
    minLength?: number;
    /** Chamado após debounce; `undefined` = limpar busca no servidor. */
    onApply: (term: string | undefined) => void;
};

/**
 * Campo de busca com debounce e mínimo de caracteres antes de chamar o servidor.
 * Filtros locais (modal, combobox) não devem usar este hook.
 */
export function useDebouncedServerSearch({
    serverValue = '',
    debounceMs = LIST_SEARCH_DEBOUNCE_MS,
    minLength = LIST_SEARCH_MIN_LENGTH,
    onApply,
}: Options) {
    const [value, setValue] = useState(serverValue);

    useEffect(() => {
        setValue(serverValue);
    }, [serverValue]);

    const trimmed = value.trim();
    const serverTrimmed = serverValue.trim();
    const isBelowMinimum = isListSearchBelowMinimum(value, minLength);

    useEffect(() => {
        if (trimmed === serverTrimmed) {
            return;
        }

        const next = serverSearchTerm(value, minLength);
        const current = serverSearchTerm(serverValue, minLength);

        if (next === current) {
            return;
        }

        const timeout = window.setTimeout(() => {
            onApply(next);
        }, debounceMs);

        return () => window.clearTimeout(timeout);
    }, [trimmed, serverTrimmed, serverValue, debounceMs, minLength, onApply, value]);

    return {
        value,
        setValue,
        isBelowMinimum,
        minLength,
    };
}
