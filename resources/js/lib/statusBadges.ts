/** Pílulas Ativo/Inativo com contraste legível (evita text-green-400 sobre fundo translúcido). */

export function activeInactivePillClass(isActive: boolean): string {
    const base = 'inline-flex items-center px-3 py-1 text-xs font-semibold leading-5 rounded-full border';
    return isActive
        ? `${base} border-brand-200 bg-brand-100 text-brand-900 dark:border-brand-600 dark:bg-brand-900/45 dark:text-brand-100`
        : `${base} border-red-200 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950/45 dark:text-red-100`;
}
