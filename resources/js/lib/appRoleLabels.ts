/** Rótulos PT para nomes de papéis Spatie (app) */
export function appRoleLabel(roleName: string): string {
    const map: Record<string, string> = {
        super_admin: 'Super administrador',
        admin: 'Administrador',
        pastor: 'Pastor',
        secretaria: 'Secretaria',
        lider_ministerio: 'Líder de ministério',
        financeiro: 'Financeiro',
        membro: 'Usuário (app)',
    };
    return map[roleName] ?? roleName.replace(/_/g, ' ');
}
