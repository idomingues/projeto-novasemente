/**
 * 28 crenças adventistas — títulos, resumos nos cards e imagens oficiais.
 * Texto integral (declaração + referências): `adventistBeliefsFullText.gen.ts` (regenerar com
 * `php scripts/fetch-adventist-beliefs-text.php`). Vídeos: `sourceUrl`.
 */
export interface AdventistBelief {
    n: number;
    title: string;
    slug: string;
    summary: string;
    imageUrl: string;
    sourceUrl: string;
}

const BASE = 'https://institucional.adventistas.org/pt/nossas-crencas';

export const ADVENTIST_BELIEFS_SOURCE = `${BASE}/`;

export const adventistBeliefs: AdventistBelief[] = [
    {
        n: 1,
        title: 'As Escrituras Sagradas',
        slug: '1-as-escrituras-sagradas',
        summary:
            'As Escrituras Sagradas, o Antigo e o Novo Testamentos, são a Palavra de Deus escrita, dada por inspiração divina. São o registro infalível da vontade divina, norma de caráter, teste da experiência e revelação definitiva de doutrinas.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082417/1.-Header_As-Escrituras-Sagradas.jpg',
        sourceUrl: `${BASE}/1-as-escrituras-sagradas/`,
    },
    {
        n: 2,
        title: 'A Trindade',
        slug: '2-a-trindade',
        summary:
            'Há um só Deus: Pai, Filho e Espírito Santo, uma unidade de três Pessoas coeternas. Deus é imortal, onipotente, onisciente, acima de toda a criação e digno de adoração.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082358/2.-Header_Trindade.jpg',
        sourceUrl: `${BASE}/2-a-trindade/`,
    },
    {
        n: 3,
        title: 'O Pai',
        slug: '3-o-pai',
        summary:
            'Deus, o Eterno Pai, é o criador, o originador, o mantenedor e o soberano de toda a criação. Ele é justo, santo, misericordioso, paciente, cheio de amor e bondade.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082305/3.-Header_Deus.jpg',
        sourceUrl: `${BASE}/3-o-pai/`,
    },
    {
        n: 4,
        title: 'O Filho',
        slug: '4-o-filho',
        summary:
            'Deus, o Filho Eterno, encarnou-se como Jesus Cristo. Por meio dele foram criadas todas as coisas; ele revela o caráter de Deus e é o Salvador do mundo.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082227/4.-Header_Jesus.jpg',
        sourceUrl: `${BASE}/4-o-filho/`,
    },
    {
        n: 5,
        title: 'O Espírito Santo',
        slug: '5-o-espirito-santo',
        summary:
            'Deus, o Espírito Santo, atuou com o Pai e o Filho na criação, na encarnação e na redenção. Ele inspira as Escrituras, convence do pecado e capacita para uma vida nova.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082146/5.-Header_Espirito-Santo.jpg',
        sourceUrl: `${BASE}/5-o-espirito-santo/`,
    },
    {
        n: 6,
        title: 'A Criação',
        slug: '6-a-criacao',
        summary:
            'Deus comunica nas Escrituras o relato autêntico de sua atividade criadora. Ele criou o universo e, em seis dias literais, a terra e todos os seus habitantes, descansando no sétimo dia.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082042/6.-Header_Criacao.jpg',
        sourceUrl: `${BASE}/6-a-criacao/`,
    },
    {
        n: 7,
        title: 'A natureza da humanidade',
        slug: '7-a-natureza-da-humanidade',
        summary:
            'O homem e a mulher foram formados à imagem de Deus, com individualidade, liberdade de escolha e responsabilidade moral. A queda introduziu natureza pecaminosa e tendência ao mal.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082012/7.-Header_Natureza-da-Humanidade.jpg',
        sourceUrl: `${BASE}/7-a-natureza-da-humanidade/`,
    },
    {
        n: 8,
        title: 'O grande conflito',
        slug: '8-o-grande-conflito',
        summary:
            'Toda a humanidade participa do conflito entre Cristo e Satanás quanto ao caráter de Deus, à sua lei e ao seu governo. Esse conflito permeia a história humana e termina com o fim do pecado.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15081958/8.-Header_O-Grande-Conflito.jpg',
        sourceUrl: `${BASE}/8-o-grande-conflito/`,
    },
    {
        n: 9,
        title: 'Vida, morte e ressurreição de Cristo',
        slug: '9-vida-morte-e-ressurreicao-de-cristo',
        summary:
            'Na vida, morte e ressurreição de Jesus, Deus provê salvação para o mundo. Cristo viveu em perfeita obediência, morreu como substituto e ressuscitou vitorioso sobre a morte.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082032/9.-Header_Vida-Morte-e-Ressurreicao-de-Cristo.jpg',
        sourceUrl: `${BASE}/9-vida-morte-e-ressurreicao-de-cristo/`,
    },
    {
        n: 10,
        title: 'A experiência da salvação',
        slug: '10-a-experiencia-da-salvacao',
        summary:
            'Em amor infinito, Deus fez com que Cristo, que não conheceu pecado, se tornasse pecado por nós, para que nele fôssemos feitos justiça de Deus. Só pela fé recebemos essa salvação.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15081947/10.-Header_A-Experiencia-da-Salvacao.jpg',
        sourceUrl: `${BASE}/10-a-experiencia-da-salvacao/`,
    },
    {
        n: 11,
        title: 'Crescimento em Cristo',
        slug: '11-crescimento-em-cristo',
        summary:
            'Pela morte na cruz, Jesus triunfou sobre o mal. Pelo Espírito Santo, o discípulo recebe poder para vencer, crescer em graça e refletir o caráter de Cristo.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082405/11.-Header_Crescimento-em-Cristo.jpg',
        sourceUrl: `${BASE}/11-crescimento-em-cristo/`,
    },
    {
        n: 12,
        title: 'A igreja',
        slug: '12-a-igreja',
        summary:
            'A igreja é a comunidade de crentes que confessam Jesus Cristo como Senhor e Salvador. Em continuidade do povo de Deus do Antigo Testamento, é chamada a proclamar o evangelho.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082337/12.-Header_A-Igreja.jpg',
        sourceUrl: `${BASE}/12-a-igreja/`,
    },
    {
        n: 13,
        title: 'O remanescente e sua missão',
        slug: '13-o-remanescente-e-sua-missao',
        summary:
            'A igreja universal reúne todos os que creem em Cristo; nos últimos dias, o remanescente guarda os mandamentos de Deus, tem o testemunho de Jesus e anuncia a hora do juízo.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082315/13.-Header_O-Remanescente-e-a-Missao.jpg',
        sourceUrl: `${BASE}/13-o-remanescente-e-sua-missao/`,
    },
    {
        n: 14,
        title: 'Unidade no corpo de Cristo',
        slug: '14-unidade-no-corpo-de-cristo',
        summary:
            'A igreja é um corpo com muitos membros, de toda nação, tribo, língua e povo. Em Cristo somos uma nova criação, unidos em adoração, serviço e missão.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082246/14.-Header_Unidade-em-Cristo.jpg',
        sourceUrl: `${BASE}/14-unidade-no-corpo-de-cristo/`,
    },
    {
        n: 15,
        title: 'O batismo',
        slug: '15-o-batismo',
        summary:
            'Pelo batismo confessamos fé na morte e ressurreição de Jesus e testemunhamos nossa morte para o pecado e ressurreição para nova vida. Batismo por imersão é o símbolo bíblico.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082233/15.-Header_Batismo.jpg',
        sourceUrl: `${BASE}/15-o-batismo/`,
    },
    {
        n: 16,
        title: 'A ceia do Senhor',
        slug: '16-a-ceia-do-senhor',
        summary:
            'A ceia do Senhor é participação nos emblemas do corpo e sangue de Jesus, expressão de fé em seu sacrifício, comunhão com ele e renovação do compromisso de discípulo.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082208/16.-Header_A-Ceia-do-Senhor.jpg',
        sourceUrl: `${BASE}/16-a-ceia-do-senhor/`,
    },
    {
        n: 17,
        title: 'Dons e ministérios espirituais',
        slug: '17-dons-e-ministerios-espirituais',
        summary:
            'Deus concede dons espirituais a todos os membros da igreja. Cada um deve servir para edificar o corpo de Cristo e cumprir a missão no mundo.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082158/17.-Header_Dons-Espirituais.jpg',
        sourceUrl: `${BASE}/17-dons-e-ministerios-espirituais/`,
    },
    {
        n: 18,
        title: 'O dom de profecia',
        slug: '18-o-dom-de-profecia',
        summary:
            'As Escrituras mostram o dom de profecia como uma manifestação do Espírito Santo. Esse dom é característico da igreja remanescente e fortalece o povo de Deus.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082130/18.-Header_O-Dom-de-Profecia.jpg',
        sourceUrl: `${BASE}/18-o-dom-de-profecia/`,
    },
    {
        n: 19,
        title: 'A lei de Deus',
        slug: '19-a-lei-de-deus',
        summary:
            'Os grandes princípios da lei de Deus estão nos dez mandamentos e foram exemplificados na vida de Cristo. Expressam amor, justiça e vontade de Deus para a humanidade.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082111/19.-Header_A-Lei-de-Deus.jpg',
        sourceUrl: `${BASE}/19-a-lei-de-deus/`,
    },
    {
        n: 20,
        title: 'O sábado',
        slug: '20-o-sabado',
        summary:
            'O Criador, após seis dias, descansou no sétimo e instituiu o sábado para toda a humanidade. É memorial da criação, tempo de descanso, comunhão e adoração.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082055/20.-Header_Sabado.jpg',
        sourceUrl: `${BASE}/20-o-sabado/`,
    },
    {
        n: 21,
        title: 'Mordomia',
        slug: '21-mordomia',
        summary:
            'Somos mordomos de Deus no uso do tempo, oportunidades, dons, recursos e saúde. A mordomia cristã reflete gratidão, confiança e responsabilidade para com o Criador.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082348/21_Header_Mordomia-Crista.jpg',
        sourceUrl: `${BASE}/21-mordomia/`,
    },
    {
        n: 22,
        title: 'Conduta cristã',
        slug: '22-conduta-crista',
        summary:
            'Somos chamados a pensar, sentir e agir em harmonia com os princípios bíblicos. O Espírito Santo capacita para uma vida de santidade, amor e testemunho coerente.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082325/22.-Header_Conduta-Crista.jpg',
        sourceUrl: `${BASE}/22-conduta-crista/`,
    },
    {
        n: 23,
        title: 'O casamento e a família',
        slug: '23-o-casamento-e-a-familia',
        summary:
            'O casamento foi estabelecido por Deus e confirmado por Jesus como união vitalícia entre um homem e uma mulher. A família é escola de amor, fé e caráter cristão.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082258/23.-Header_Casamento-e-Familia.jpg',
        sourceUrl: `${BASE}/23-o-casamento-e-a-familia/`,
    },
    {
        n: 24,
        title: 'O ministério de Cristo no santuário celestial',
        slug: '24-o-ministerio-de-cristo-no-santuario-celestial',
        summary:
            'Há um santuário no céu, verdadeiro tabernáculo erguido pelo Senhor. Cristo ministra em nosso favor, oferecendo seu sangue e intercedendo como nosso sumo sacerdote.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082217/24.-Header_O-Ministerio-de-Cristo-no-Santuario-Celestial.jpg',
        sourceUrl: `${BASE}/24-o-ministerio-de-cristo-no-santuario-celestial/`,
    },
    {
        n: 25,
        title: 'A segunda vinda de Cristo',
        slug: '25-a-segunda-vinda-de-cristo',
        summary:
            'A segunda vinda é a bendita esperança da igreja e o clímax do evangelho. Cristo voltará em glória, os mortos em Cristo ressuscitarão e os vivos serão transformados.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082139/25.-Header_A-Segunda-Vinda-de-Cristo.jpg',
        sourceUrl: `${BASE}/25-a-segunda-vinda-de-cristo/`,
    },
    {
        n: 26,
        title: 'Morte e ressurreição',
        slug: '26-morte-e-ressurreicao',
        summary:
            'O salário do pecado é a morte. Deus, o único imortal, dará vida eterna aos remidos. Os ímpios morrerão destruição eterna, sem tortura consciente após o juízo.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082120/26.-Header_Morte-e-Ressurreicao.jpg',
        sourceUrl: `${BASE}/26-morte-e-ressurreicao/`,
    },
    {
        n: 27,
        title: 'O milênio e o fim do pecado',
        slug: '27-o-milenio-e-o-fim-do-pecado',
        summary:
            'O milênio é o reinado de mil anos de Cristo com os salvos no céu, entre a primeira e a segunda ressurreição. Ao fim, Deus criará novos céus e nova terra.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082048/27.-Header_Milenio-e-o-Fim-do-Pecado.jpg',
        sourceUrl: `${BASE}/27-o-milenio-e-o-fim-do-pecado/`,
    },
    {
        n: 28,
        title: 'A nova terra',
        slug: '28-a-nova-terra',
        summary:
            'Na nova terra, em que habita justiça, Deus preparará lar eterno para os remidos. Lá não haverá dor nem morte; contemplaremos a face de Deus e reinaremos com Cristo.',
        imageUrl:
            'https://images-adv.adventistas.org/file/images-adv/institucional_v2/sites/3/2024/04/15082025/28.-Header_A-Nova-Terra.jpg',
        sourceUrl: `${BASE}/28-a-nova-terra/`,
    },
];
