import {
    BuildingOffice2Icon,
    MusicalNoteIcon,
    KeyIcon,
    SpeakerWaveIcon,
    HeartIcon,
    UserGroupIcon,
    InboxIcon,
    FilmIcon,
    MegaphoneIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

export const DEPARTMENT_ICON_OPTIONS: { key: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
    { key: 'building', label: 'Prédio', Icon: BuildingOffice2Icon },
    { key: 'musical_note', label: 'Louvor / Música', Icon: MusicalNoteIcon },
    { key: 'key', label: 'Portaria', Icon: KeyIcon },
    { key: 'speaker', label: 'Som', Icon: SpeakerWaveIcon },
    { key: 'heart', label: 'Intercessão', Icon: HeartIcon },
    { key: 'user_group', label: 'Crianças / Grupo', Icon: UserGroupIcon },
    { key: 'inbox', label: 'Recepção', Icon: InboxIcon },
    { key: 'film', label: 'Mídia', Icon: FilmIcon },
    { key: 'megaphone', label: 'Comunicação', Icon: MegaphoneIcon },
];

const iconByKey: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = Object.fromEntries(
    DEPARTMENT_ICON_OPTIONS.map((o) => [o.key, o.Icon])
);

function norm(s: string): string {
    return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const iconByMinistryName: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
    [norm('Louvor')]: MusicalNoteIcon,
    [norm('Portaria')]: KeyIcon,
    [norm('Som')]: SpeakerWaveIcon,
    [norm('Intercessão')]: HeartIcon,
    [norm('Crianças')]: UserGroupIcon,
    [norm('Recepção')]: InboxIcon,
    [norm('Midia')]: FilmIcon,
    [norm('Comunicação')]: MegaphoneIcon,
};

export function getMinistryIcon(name: string): ComponentType<SVGProps<SVGSVGElement>> {
    return iconByMinistryName[norm(name)] ?? BuildingOffice2Icon;
}

export function getMinistryIconByKey(key: string | null): ComponentType<SVGProps<SVGSVGElement>> {
    return (key && iconByKey[key]) ?? BuildingOffice2Icon;
}
