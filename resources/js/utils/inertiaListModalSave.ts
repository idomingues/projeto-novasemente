/**
 * Opções padrão ao salvar formulário em modal sobre lista (Inertia).
 * Mantém o modal aberto, o scroll e o estado local; a lista atualiza pelos props da resposta.
 */
export const inertiaListModalSave = {
    preserveScroll: true,
    preserveState: true,
} as const;
