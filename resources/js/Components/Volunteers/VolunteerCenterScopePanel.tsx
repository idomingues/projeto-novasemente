import TextInput from '@/Components/TextInput';
import { getMinistryIcon, getMinistryIconByKey } from '@/lib/ministryIcons';
import type { CenterGroupBy } from '@/utils/centerVolunteersQuery';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export type VolunteerCenterDepartmentRow = {
    id: number;
    name: string;
    icon: string | null;
    leaders: string[];
    volunteerCount: number;
    forwardedCount: number;
};

export type VolunteerCenterPhaseRow = {
    key: string;
    label: string;
    volunteerCount: number;
};

type Props = {
    groupBy: CenterGroupBy;
    onGroupByChange: (next: CenterGroupBy) => void;
    sidebarSearch: string;
    onSidebarSearchChange: (value: string) => void;
    departments: VolunteerCenterDepartmentRow[];
    phases: VolunteerCenterPhaseRow[];
    filteredDepartments: VolunteerCenterDepartmentRow[];
    filteredPhases: VolunteerCenterPhaseRow[];
    selectedMinistryId: number | null;
    selectedPhaseKey: string | null;
    allDepartmentsTotal: number;
    allPhasesTotal: number;
    withoutDepartmentCount: number;
    showWithoutDepartment: boolean;
    onSelectAllDepartments: () => void;
    onSelectDepartment: (id: number | 'none') => void;
    onSelectAllPhases: () => void;
    onSelectPhase: (key: string) => void;
    compactInputClass?: string;
    /** Sidebar desktop (compacto) vs modal mobile (toques maiores). */
    density?: 'compact' | 'comfortable';
    listClassName?: string;
};

export default function VolunteerCenterScopePanel({
    groupBy,
    onGroupByChange,
    sidebarSearch,
    onSidebarSearchChange,
    filteredDepartments,
    filteredPhases,
    selectedMinistryId,
    selectedPhaseKey,
    allDepartmentsTotal,
    allPhasesTotal,
    withoutDepartmentCount,
    showWithoutDepartment,
    onSelectAllDepartments,
    onSelectDepartment,
    onSelectAllPhases,
    onSelectPhase,
    compactInputClass = '!h-8 !min-h-8 !rounded-lg !px-2.5 !py-1 !text-sm shadow-none sm:!text-sm',
    density = 'comfortable',
    listClassName,
}: Props) {
    const isPhaseGroup = groupBy === 'fase';
    const compact = density === 'compact';
    const rowPad = compact ? 'px-2 py-1' : 'px-3 py-2';
    const rowText = compact ? 'text-[11px]' : 'text-sm';
    const badgeText = compact ? 'text-[10px] px-1.5 py-px' : 'text-[11px] px-2 py-0.5';
    const iconBox = compact ? 'h-6 w-6' : 'h-7 w-7';
    const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';
    const tabText = compact ? 'text-[10px] py-1' : 'text-xs py-1.5';
    const listWrapClass =
        listClassName ??
        (compact
            ? 'min-h-0 flex-1 space-y-0.5 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900'
            : 'min-h-0 max-h-[min(55dvh,420px)] space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900');

    const rowBtn = `flex w-full cursor-pointer items-center rounded-lg border text-left transition ${rowPad}`;
    const rowBtnBetween = `${rowBtn} justify-between gap-${compact ? '1.5' : '2'}`;
    const rowBtnGap = `${rowBtn} gap-${compact ? '1.5' : '2'}`;

    return (
        <div className="flex min-h-0 flex-col">
            <div
                className={`${compact ? 'mb-1.5' : 'mb-3'} flex shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-800/80`}
                role="tablist"
                aria-label="Agrupar por"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={!isPhaseGroup}
                    onClick={() => onGroupByChange('departamento')}
                    title="Agrupar a lista por departamento"
                    className={`flex-1 cursor-pointer rounded-md px-2 ${tabText} font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                        !isPhaseGroup
                            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-inset ring-emerald-700/30 dark:bg-emerald-600 dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/70 dark:hover:bg-zinc-900/40'
                    }`}
                >
                    Departamento
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={isPhaseGroup}
                    onClick={() => onGroupByChange('fase')}
                    title="Agrupar a lista por fase"
                    className={`flex-1 cursor-pointer rounded-md px-2 ${tabText} font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                        isPhaseGroup
                            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-inset ring-emerald-700/30 dark:bg-emerald-600 dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/70 dark:hover:bg-zinc-900/40'
                    }`}
                >
                    Fase
                </button>
            </div>

            <div className={`relative ${compact ? 'mb-1.5' : 'mb-3'} shrink-0`}>
                <MagnifyingGlassIcon className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                <TextInput
                    type="search"
                    value={sidebarSearch}
                    onChange={(e) => onSidebarSearchChange(e.target.value)}
                    placeholder={isPhaseGroup ? 'Buscar fase…' : 'Buscar departamento…'}
                    title={isPhaseGroup ? 'Buscar fase na lista lateral' : 'Buscar departamento na lista lateral'}
                    className={`${compactInputClass} ${compact ? '!pl-7' : '!pl-8'}`}
                    autoComplete="off"
                />
            </div>

            <div className={listWrapClass}>
                {isPhaseGroup ? (
                    <>
                        <button
                            type="button"
                            onClick={onSelectAllPhases}
                            title={`Mostrar todas as fases (${allPhasesTotal} voluntários)`}
                            className={`${rowBtnBetween} ${
                                selectedPhaseKey === null
                                    ? 'border-emerald-500 bg-emerald-50/90 dark:border-emerald-600 dark:bg-emerald-950/40'
                                    : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                            }`}
                        >
                            <span className={`min-w-0 flex-1 truncate font-medium leading-tight text-zinc-900 dark:text-white ${rowText}`}>
                                Todos
                            </span>
                            <span className={`shrink-0 rounded-full bg-zinc-200 font-semibold tabular-nums text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 ${badgeText}`}>
                                {allPhasesTotal}
                            </span>
                        </button>
                        {filteredPhases.map((p) => {
                            const selected = selectedPhaseKey === p.key;
                            return (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => onSelectPhase(p.key)}
                                    title={`Filtrar pela fase ${p.label} (${p.volunteerCount} voluntários)`}
                                    className={`${rowBtnBetween} ${
                                        selected
                                            ? 'border-emerald-500 bg-emerald-50/90 dark:border-emerald-600 dark:bg-emerald-950/40'
                                            : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                                    }`}
                                >
                                    <span className={`min-w-0 flex-1 truncate font-medium leading-tight text-zinc-900 dark:text-white ${rowText}`}>
                                        {p.label}
                                    </span>
                                    <span className={`shrink-0 rounded-full bg-zinc-200 font-semibold tabular-nums text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 ${badgeText}`}>
                                        {p.volunteerCount}
                                    </span>
                                </button>
                            );
                        })}
                        {filteredPhases.length === 0 ? (
                            <p className="px-3 py-4 text-center text-sm text-zinc-500">Nenhuma fase encontrada.</p>
                        ) : null}
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={onSelectAllDepartments}
                            title={`Mostrar todos os departamentos (${allDepartmentsTotal} voluntários)`}
                            className={`${rowBtnBetween} ${
                                selectedMinistryId === null
                                    ? 'border-emerald-500 bg-emerald-50/90 dark:border-emerald-600 dark:bg-emerald-950/40'
                                    : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                            }`}
                        >
                            <span className={`min-w-0 flex-1 truncate font-medium leading-tight text-zinc-900 dark:text-white ${rowText}`}>
                                Todos
                            </span>
                            <span className={`shrink-0 rounded-full bg-zinc-200 font-semibold tabular-nums text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 ${badgeText}`}>
                                {allDepartmentsTotal}
                            </span>
                        </button>
                        {filteredDepartments.map((d) => {
                            const Icon = d.icon ? getMinistryIconByKey(d.icon) : getMinistryIcon(d.name);
                            const selected = selectedMinistryId === d.id;
                            return (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => onSelectDepartment(d.id)}
                                    title={`Filtrar pelo departamento ${d.name} (${d.volunteerCount} voluntários)`}
                                    className={`${rowBtnGap} ${
                                        selected
                                            ? 'border-emerald-500 bg-emerald-50/90 dark:border-emerald-600 dark:bg-emerald-950/40'
                                            : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                                    }`}
                                >
                                    <span className={`flex shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 ${iconBox}`}>
                                        <Icon className={iconSize} />
                                    </span>
                                    <span className={`min-w-0 flex-1 truncate font-medium leading-tight text-zinc-900 dark:text-white ${rowText}`}>
                                        {d.name}
                                    </span>
                                    <span className={`shrink-0 rounded-full bg-zinc-200 font-semibold tabular-nums text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 ${badgeText}`}>
                                        {d.volunteerCount}
                                    </span>
                                </button>
                            );
                        })}
                        {showWithoutDepartment ? (
                            <button
                                type="button"
                                onClick={() => onSelectDepartment('none')}
                                title={`Mostrar voluntários sem departamento (${withoutDepartmentCount})`}
                                className={`${rowBtnBetween} ${
                                    selectedMinistryId === 0
                                        ? 'border-violet-500 bg-violet-50/90 dark:border-violet-600 dark:bg-violet-950/40'
                                        : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                                }`}
                            >
                                <span className={`truncate font-medium text-zinc-800 dark:text-zinc-100 ${rowText}`}>
                                    Sem departamento
                                </span>
                                <span className={`shrink-0 rounded-full bg-violet-100 font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200 ${badgeText}`}>
                                    {withoutDepartmentCount}
                                </span>
                            </button>
                        ) : null}
                        {filteredDepartments.length === 0 && !showWithoutDepartment ? (
                            <p className="px-3 py-4 text-center text-sm text-zinc-500">Nenhum departamento encontrado.</p>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}
