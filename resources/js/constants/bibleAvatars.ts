export type BibleAvatarGender = 'male' | 'female';

export type BibleAvatarOption = {
    key: string;
    label: string;
    gender: BibleAvatarGender;
    imageUrl: string;
};

const base = '/images/bible-avatars';

const maleFiles: { slug: string; label: string }[] = [
    { slug: 'david', label: 'Davi' },
    { slug: 'moses', label: 'Moisés' },
    { slug: 'joseph', label: 'José' },
    { slug: 'daniel', label: 'Daniel' },
    { slug: 'peter', label: 'Pedro' },
    { slug: 'paul', label: 'Paulo' },
    { slug: 'abraham', label: 'Abraão' },
    { slug: 'jonah', label: 'Jonas' },
    { slug: 'elijah', label: 'Elias' },
    { slug: 'solomon', label: 'Salomão' },
    { slug: 'john', label: 'João' },
    { slug: 'timothy', label: 'Timóteo' },
];

const femaleFiles: { slug: string; label: string }[] = [
    { slug: 'esther', label: 'Ester' },
    { slug: 'mary', label: 'Maria' },
    { slug: 'ruth', label: 'Rute' },
    { slug: 'deborah', label: 'Débora' },
    { slug: 'sarah', label: 'Sara' },
    { slug: 'rachel', label: 'Raquel' },
    { slug: 'miriam', label: 'Miriã' },
    { slug: 'lydia', label: 'Lídia' },
    { slug: 'priscilla', label: 'Priscila' },
    { slug: 'hannah', label: 'Ana' },
    { slug: 'junia', label: 'Júnias' },
    { slug: 'abigail', label: 'Abigail' },
];

function build(gender: BibleAvatarGender, rows: { slug: string; label: string }[]): BibleAvatarOption[] {
    return rows.map((row) => ({
        key: `${gender}:${row.slug}`,
        label: row.label,
        gender,
        imageUrl: `${base}/${gender}/${row.slug}.svg`,
    }));
}

export const BIBLE_AVATARS_MALE = build('male', maleFiles);
export const BIBLE_AVATARS_FEMALE = build('female', femaleFiles);

export const BIBLE_AVATARS_ALL: BibleAvatarOption[] = [...BIBLE_AVATARS_MALE, ...BIBLE_AVATARS_FEMALE];

export function bibleAvatarByKey(key: string | null | undefined): BibleAvatarOption | undefined {
    if (!key) return undefined;
    return BIBLE_AVATARS_ALL.find((a) => a.key === key);
}

export function bibleAvatarPreviewUrl(key: string | null | undefined): string | null {
    return bibleAvatarByKey(key)?.imageUrl ?? null;
}

export function bibleAvatarKeyFromPhotoUrl(url: string | null | undefined): string {
    if (!url) return '';
    const match = BIBLE_AVATARS_ALL.find((a) => url.includes(a.imageUrl));
    return match?.key ?? '';
}
