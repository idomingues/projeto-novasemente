export type ConstrucaoIgrejaStoryData = {
    launch_date: string;
    as_of_date: string;
    raised_amount: number;
    eyebrow: string;
    title: string;
    paragraphs: string[];
    highlights: string[];
};

export const CONSTRUCAO_IGREJA_HERO_IMAGE = '/images/caixa-fixo-igreja-hero.jpg';

export const CONSTRUCAO_IGREJA_DEFAULTS: ConstrucaoIgrejaStoryData = {
    launch_date: '2023-11-01',
    as_of_date: '2026-06-27',
    raised_amount: 5_866_737.86,
    eyebrow: 'Campanha da construção',
    title: 'Uma casa construída com fidelidade',
    paragraphs: [
        'Desde o lançamento oficial da campanha da construção, a Igreja Adventista da Nova Semente tem caminhado unida para erguer um espaço permanente de culto, evangelismo e acolhimento.',
        'Cada contribuição fortalece a missão, reduz a dívida da obra e amplia o alcance do evangelho para milhares de pessoas que ainda precisam conhecer Jesus.',
    ],
    highlights: [
        'Templo preparado para receber milhares de pessoas semanalmente.',
        'Estrutura que sustenta cultos, transmissões e ações missionárias.',
        'Obra sustentada pela generosidade e fidelidade do povo de Deus.',
    ],
};

export function defaultConstrucaoIgrejaStory(): ConstrucaoIgrejaStoryData {
    return {
        ...CONSTRUCAO_IGREJA_DEFAULTS,
        paragraphs: [...CONSTRUCAO_IGREJA_DEFAULTS.paragraphs],
        highlights: [...CONSTRUCAO_IGREJA_DEFAULTS.highlights],
    };
}

/** Valor arrecadado da história — usado na barra de progresso. */
export function construcaoProgressRaised(story: ConstrucaoIgrejaStoryData | null | undefined): number | null {
    if (!story || typeof story.raised_amount !== 'number' || !Number.isFinite(story.raised_amount)) {
        return null;
    }
    return Math.abs(story.raised_amount);
}

export function formatConstrucaoDate(value: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}
