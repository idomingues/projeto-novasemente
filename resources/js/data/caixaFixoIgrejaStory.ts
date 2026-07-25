export type CostBarTone =
    | 'sky'
    | 'emerald'
    | 'amber'
    | 'violet'
    | 'orange'
    | 'stone'
    | 'zinc'
    | 'cyan'
    | 'yellow'
    | 'lime'
    | 'blue'
    | 'rose'
    | 'indigo'
    | 'red';

export type AnnualLineTone = 'emerald' | 'sky' | 'amber' | 'orange' | 'brand';

export type CostItem = {
    label: string;
    percent: number;
    amount: number;
    tone: CostBarTone;
    compact?: boolean;
};

export type AnnualLine = {
    label: string;
    amount: number;
    tone: AnnualLineTone;
    emphasize?: boolean;
    /** Entrada / saída no resumo; omitir em saldo base ou final. */
    flow?: 'in' | 'out';
};

export const CAIXA_FIXO_MONTHLY_TOTAL = 177_948.95;

export const CAIXA_FIXO_INTRO = {
    title: 'Nova Semente: Uma Igreja Viva, Uma Missão Permanente',
    paragraphs: [
        'A Igreja Adventista da Nova Semente é muito mais do que um templo. São mais de 2.800 m² de área construída, preparados para receber milhares de pessoas semanalmente, produzir conteúdo evangelístico de excelência e proporcionar uma experiência real e transformadora com Deus.',
        'Por trás de cada culto, transmissão, atendimento e ação missionária existe uma estrutura que funciona todos os dias, mantendo um ambiente acolhedor, seguro e preparado para cumprir a missão.',
    ],
};

export const CAIXA_FIXO_COST_ITEMS: CostItem[] = [
    { label: 'Parcela da Construção (AP)', percent: 28.1, amount: 50_000, tone: 'sky' },
    { label: 'Músicos, Som e Louvor', percent: 19.02, amount: 33_851.19, tone: 'emerald' },
    { label: 'Segurança', percent: 16.18, amount: 28_785.4, tone: 'amber' },
    { label: 'Pré e Pós-Produção (TV, Vídeo e Programa)', percent: 15.17, amount: 26_996.97, tone: 'violet' },
    { label: 'Equipe de Limpeza', percent: 5.67, amount: 10_094.29, tone: 'orange' },
    { label: 'Gestão Patrimonial', percent: 3.44, amount: 6_120, tone: 'stone' },
    { label: 'Material de Higiene', percent: 3.4, amount: 6_058.45, tone: 'zinc' },
    { label: 'Ar-Condicionado', percent: 2.63, amount: 4_684, tone: 'cyan' },
    { label: 'Energia Elétrica', percent: 2.3, amount: 4_095.78, tone: 'yellow' },
    { label: 'Conservação Predial', percent: 2.27, amount: 4_038.48, tone: 'lime' },
    { label: 'Água e Esgoto', percent: 0.85, amount: 1_519.01, tone: 'blue', compact: true },
    { label: 'Material de Consumo', percent: 0.74, amount: 1_320.38, tone: 'rose', compact: true },
    { label: 'Internet', percent: 0.19, amount: 336.94, tone: 'indigo', compact: true },
    { label: 'Gás', percent: 0.03, amount: 48.06, tone: 'red', compact: true },
];

export const CAIXA_FIXO_EXECUTIVE_SUMMARY: string[] = [
    '28,10% destinam-se ao compromisso financeiro da construção do templo.',
    '50,37% sustentam diretamente a excelência dos cultos e transmissões (música, som, produção e audiovisual).',
    '16,18% garantem segurança para todos que frequentam a igreja.',
    '5,67% mantêm diariamente a limpeza e organização dos ambientes.',
    'Mais de 99% dos custos são investimentos que permitem que milhares de pessoas sejam alcançadas presencialmente e pelas plataformas digitais.',
];

export const CAIXA_FIXO_ANNUAL_YEAR = 2026;

export const CAIXA_FIXO_ANNUAL_LINES: AnnualLine[] = [
    { label: 'Saldo inicial', amount: 407_381.06, tone: 'emerald' },
    { label: 'Ofertas 2026', amount: 977_249.48, tone: 'sky', flow: 'in' },
    { label: 'Despesas 2026', amount: -856_814.83, tone: 'amber', flow: 'out' },
    { label: 'Repassar AP Construção', amount: -468_816.9, tone: 'orange', flow: 'out' },
    { label: 'Saldo atual', amount: 58_998.81, tone: 'brand', emphasize: true },
];

export const CAIXA_FIXO_CLOSING = {
    title: 'Uma missão que pertence a todos nós',
    paragraphs: [
        'Cada cadeira organizada, cada ambiente limpo, cada nota musical, cada câmera ligada, cada colaborador, cada transmissão ao vivo e cada pessoa recebida com carinho só existem porque homens e mulheres escolhem colocar Deus em primeiro lugar.',
        'Quando devolvemos nossos dízimos e entregamos nossas ofertas com fidelidade, não estamos apenas pagando contas. Estamos sustentando um centro permanente de evangelismo, esperança e salvação.',
        'Cada contribuição ajuda a manter esta casa aberta, fortalece a missão, reduz a dívida da construção e amplia o alcance do evangelho para milhares de pessoas que ainda precisam conhecer Jesus.',
        'A Nova Semente é fruto da fidelidade de Deus e da generosidade do Seu povo. Juntos continuaremos construindo uma igreja que transforma vidas, hoje e para a eternidade.',
    ],
    verse: {
        text: 'Honra ao Senhor com os teus bens e com as primícias de toda a tua renda; e se encherão fartamente os teus celeiros.',
        reference: 'Provérbios 3:9-10',
    },
};
