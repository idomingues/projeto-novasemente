/**
 * Opções padrão ao salvar formulário em modal sobre lista (Inertia).
 * Mantém o modal aberto, o scroll e o estado local; a lista atualiza pelos props da resposta.
 *
 * Não feche o modal em `onSuccess` — só resete o formulário ou mostre feedback.
 * Fechar após salvar quebra edições seguidas e revisão do que foi gravado.
 */
export const inertiaListModalSave = {
    preserveScroll: true,
    preserveState: true,
} as const;
