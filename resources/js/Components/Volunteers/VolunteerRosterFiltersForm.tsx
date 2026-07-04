import BrDateInput from '@/Components/BrDateInput';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import TextInput from '@/Components/TextInput';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { VolunteerRosterBoardFilters } from '@/utils/volunteerRosterList';
import { useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';

const tri = (
    <>
        <option value="">Qualquer</option>
        <option value="1">Sim</option>
        <option value="0">Não</option>
    </>
);

type Ministry = { id: number; name: string };

type VolunteerRosterFilterFormReturn = ReturnType<typeof useForm<VolunteerRosterBoardFilters>>;

type Props = {
    filterForm: VolunteerRosterFilterFormReturn;
    ministries: Ministry[];
    attendanceOptions: { value: string; label: string }[];
    onSubmit: FormEventHandler;
    onClear: () => void;
};

export default function VolunteerRosterFiltersForm({ filterForm, ministries, attendanceOptions, onSubmit, onClear }: Props) {
    return (
<form onSubmit={onSubmit} className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    <div className="sm:col-span-2 xl:col-span-3">
                                        <InputLabel value="Cadastro de usuário no app" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_user_account}
                                            onChange={(e) => filterForm.setData('has_user_account', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="WhatsApp" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_whatsapp}
                                            onChange={(e) => filterForm.setData('has_whatsapp', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Redes sociais" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_social_networks}
                                            onChange={(e) => filterForm.setData('has_social_networks', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Membro oficial" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.is_official_member}
                                            onChange={(e) => filterForm.setData('is_official_member', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Registro na Nova Semente" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.member_record_at_nova_semente}
                                            onChange={(e) => filterForm.setData('member_record_at_nova_semente', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Experiência em ministério" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_previous_ministry_volunteer_experience}
                                            onChange={(e) => filterForm.setData('has_previous_ministry_volunteer_experience', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Orientação pastoral" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.needs_pastoral_guidance}
                                            onChange={(e) => filterForm.setData('needs_pastoral_guidance', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="LGPD" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.lgpd_data_consent}
                                            onChange={(e) => filterForm.setData('lgpd_data_consent', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Ativo" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.active}
                                            onChange={(e) => filterForm.setData('active', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Só app" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.app_access_only}
                                            onChange={(e) => filterForm.setData('app_access_only', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Cargo (texto)" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.role}
                                            onChange={(e) => filterForm.setData('role', e.target.value)}
                                            placeholder="Ex.: Diácono, Líder…"
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Tem e-mail" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_email}
                                            onChange={(e) => filterForm.setData('has_email', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Tem telefone" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_phone}
                                            onChange={(e) => filterForm.setData('has_phone', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Tem data de nascimento" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_birth_date}
                                            onChange={(e) => filterForm.setData('has_birth_date', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Tempo na igreja (cadastro novo)" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.attendance_duration}
                                            onChange={(e) => filterForm.setData('attendance_duration', e.target.value)}
                                        >
                                            <option value="">Qualquer</option>
                                            {attendanceOptions.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Tempo como voluntário (recadastro) — texto" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.attendance_duration_text}
                                            onChange={(e) => filterForm.setData('attendance_duration_text', e.target.value)}
                                            placeholder="Ex.: 1 ano, 6 meses, desde 2020…"
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Cadastro desde" />
                                        <TextInput
                                            
                                            className="mt-1"
                                            value={filterForm.data.created_from}
                                            onChange={(e) => filterForm.setData('created_from', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Cadastro até" />
                                        <TextInput
                                            
                                            className="mt-1"
                                            value={filterForm.data.created_to}
                                            onChange={(e) => filterForm.setData('created_to', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Nascimento desde" />
                                        <BrDateInput
                                            className="mt-1"
                                            value={filterForm.data.birth_date_from}
                                            onChange={(iso) => filterForm.setData('birth_date_from', iso)}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Nascimento até" />
                                        <BrDateInput
                                            className="mt-1"
                                            value={filterForm.data.birth_date_to}
                                            onChange={(iso) => filterForm.setData('birth_date_to', iso)}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Área profissional" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.professional_area}
                                            onChange={(e) => filterForm.setData('professional_area', e.target.value)}
                                            placeholder="Ex.: Saúde, TI, Educação…"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 xl:col-span-2">
                                        <InputLabel value="Registro em qual igreja (texto)" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.member_record_church}
                                            onChange={(e) => filterForm.setData('member_record_church', e.target.value)}
                                            placeholder="Ex.: Central, Paulista…"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 xl:col-span-3">
                                        <InputLabel value="Departamentos (seleção múltipla)" />
                                        <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                                {ministries.map((m) => {
                                                    const selected = (filterForm.data.ministry_ids || '')
                                                        .split(',')
                                                        .map((x: string) => x.trim())
                                                        .filter(Boolean)
                                                        .includes(String(m.id));
                                                    return (
                                                        <label key={m.id} className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={selected}
                                                                onChange={(e) => {
                                                                    const cur = (filterForm.data.ministry_ids || '')
                                                                        .split(',')
                                                                        .map((x: string) => x.trim())
                                                                        .filter(Boolean);
                                                                    const id = String(m.id);
                                                                    const next = e.target.checked
                                                                        ? Array.from(new Set([...cur, id]))
                                                                        : cur.filter((x: string) => x !== id);
                                                                    filterForm.setData('ministry_ids', next.join(','));
                                                                }}
                                                                className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-500"
                                                            />
                                                            <span className="text-sm text-zinc-900 dark:text-zinc-100">{m.name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            {ministries.length === 0 ? (
                                                <div className="text-xs text-zinc-500 dark:text-zinc-400">Nenhum departamento disponível.</div>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2 xl:col-span-3">
                                        <InputLabel value="Palavras nos textos (interesses, dons…)" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.text_interest}
                                            onChange={(e) => filterForm.setData('text_interest', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <PrimaryButton
                                        type="submit"
                                        title="Aplicar os filtros do cadastro"
                                        className="inline-flex items-center gap-1"
                                        disabled={filterForm.processing}
                                    >
                                        <MagnifyingGlassIcon className="h-4 w-4" aria-hidden />
                                        Aplicar
                                    </PrimaryButton>
                                    <SecondaryButton type="button" title="Limpar os filtros do cadastro" onClick={onClear}>
                                        Limpar
                                    </SecondaryButton>
                                </div>
                            </form>
    );
}
