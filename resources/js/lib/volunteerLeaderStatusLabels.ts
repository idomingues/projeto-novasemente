/** Rótulos PT-BR do status do líder por departamento (`leader_status`). */
export function volunteerLeaderStatusLabel(status: string | null | undefined): string {
    if (status === 'denied') return 'Recusado';
    if (status === 'training') return 'Em treinamento';
    if (status === 'ready') return 'Pronto para servir';
    if (status === 'active') return 'Atuante';
    return '—';
}
