import { confirmEncaminharOnDepartmentLink } from '@/utils/confirmDialog';

/**
 * Se há departamentos novos no check, pergunta se registra encaminhamento.
 * @returns `null` se o usuário cancelou; senão o valor de `encaminhar` no payload.
 */
export async function askEncaminharWhenLinkingDepartments(
    previousAttachedIds: number[],
    nextMinistryIds: number[],
    ministryOptions: Array<{ id: number; name: string }>,
): Promise<boolean | null> {
    const prev = new Set(previousAttachedIds.map((id) => Number(id)));
    const addedIds = nextMinistryIds.map((id) => Number(id)).filter((id) => id > 0 && !prev.has(id));
    if (addedIds.length === 0) {
        return false;
    }

    const nameById = new Map(ministryOptions.map((o) => [Number(o.id), o.name]));
    const names = addedIds.map((id) => nameById.get(id) ?? `Departamento #${id}`);
    const choice = await confirmEncaminharOnDepartmentLink(names);
    if (choice === 'cancel') {
        return null;
    }

    return choice === 'encaminhar';
}
