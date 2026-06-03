import type { VolunteerModalUrlTab } from '@/utils/volunteerPipelineModalSave';

type Props = {
    detailTab: VolunteerModalUrlTab;
    onSelectTab: (tab: VolunteerModalUrlTab) => void;
    canVolunteerManage: boolean;
    showUsuarioAppTab: boolean;
    /** Leitura das anotações internas (equipe + líderes com acesso ao quadro). */
    canViewVolunteerNotes?: boolean;
    notesCount?: number;
};

const tabBtnClass = (active: boolean) =>
    `shrink-0 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition sm:flex-1 sm:px-3 sm:text-sm ${
        active
            ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
            : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
    }`;

export default function VolunteerPipelineDetailTabBar({
    detailTab,
    onSelectTab,
    canVolunteerManage,
    showUsuarioAppTab,
    canViewVolunteerNotes = true,
    notesCount = 0,
}: Props) {
    const notesBadge =
        notesCount > 0 ? (
            <span className="ml-1.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold text-white dark:bg-teal-500">
                {notesCount > 99 ? '99+' : notesCount}
            </span>
        ) : null;

    return (
        <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800 sm:flex-nowrap sm:overflow-x-auto sm:overscroll-x-contain sm:[-webkit-overflow-scrolling:touch]">
            <button type="button" onClick={() => onSelectTab('ficha')} className={tabBtnClass(detailTab === 'ficha')}>
                Ficha
            </button>
            {canViewVolunteerNotes ? (
                <button type="button" onClick={() => onSelectTab('notas')} className={tabBtnClass(detailTab === 'notas')}>
                    Anotações
                    {notesBadge}
                </button>
            ) : null}
            <button
                type="button"
                onClick={() => onSelectTab('departamentos')}
                className={tabBtnClass(detailTab === 'departamentos')}
            >
                Departamentos
            </button>
            <button
                type="button"
                onClick={() => onSelectTab('historico')}
                className={tabBtnClass(detailTab === 'historico')}
            >
                Histórico e status
            </button>
            {canVolunteerManage && showUsuarioAppTab ? (
                <button type="button" onClick={() => onSelectTab('usuario')} className={tabBtnClass(detailTab === 'usuario')}>
                    Usuário APP
                </button>
            ) : null}
        </div>
    );
}
