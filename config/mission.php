<?php

return [

    'professions' => [
        'Administrador(a)',
        'Advogado(a)',
        'Pedagogo(a)',
        'Enfermeiro(a)',
        'Psicólogo(a)',
        'Contador(a)',
        'Engenheiro(a) Civil',
        'Médico(a)',
        'Profissional de Educação Física',
        'Arquiteto(a)',
        'Farmacêutico(a)',
        'Assistente Social',
        'Nutricionista',
        'Analista de Sistemas (TI)',
    ],

    'beliefs' => [
        'Cristianismo (Catolicismo)',
        'Cristianismo (Protestantismo / Evangélicos)',
        'Sem religião',
        'Espiritismo',
        'Religiões afro-brasileiras (como Candomblé e Umbanda)',
        'Budismo',
        'Judaísmo',
        'Islamismo',
        'Outra',
    ],

    'religions' => [
        'Igreja Católica Apostólica Romana',
        'Assembleia de Deus',
        'Igreja Universal do Reino de Deus',
        'Igreja do Evangelho Quadrangular',
        'Igreja Batista',
        'Igreja Presbiteriana',
        'Igreja Adventista do Sétimo Dia',
        'Igreja Mundial do Poder de Deus',
        'Igreja Internacional da Graça de Deus',
        'Igreja Metodista',
        'Igreja Luterana',
        'Outra',
    ],

    'seeks_in_community' => [
        'Amigos/Pessoas',
        'Espaço/Ambiente',
        'Música/Louvor',
        'Ensinamentos/doutrinas',
        'Busca proposito/sentido',
        'Outra',
    ],

    'studied_bible' => [
        'Sim, completamente',
        'Sim, parcialmente',
        'Não',
    ],

    'first_contact_via' => [
        'Amigos',
        'Redes Sociais',
        'Eventos',
        'Busca própria',
        'Outra',
    ],

    'wants_bible_study_partner' => [
        'Sim',
        'Talvez, gostaria de mais informações',
        'Não',
    ],

    'message_moderation' => [
        'enabled' => env('MISSION_MESSAGE_MODERATION_ENABLED', true),
        'openai_api_key' => env('OPENAI_API_KEY'),
        'model' => env('OPENAI_MODERATION_MODEL', 'omni-moderation-latest'),
        'timeout_seconds' => (int) env('OPENAI_MODERATION_TIMEOUT', 12),
        /** Termos usados só se a API da OpenAI não estiver configurada ou falhar. */
        'heuristic_terms' => [],
    ],

    'post_registration_instructions' => [
        'Nossa equipe missionária analisará seu cadastro e entrará em contato pelo telefone informado.',
        'Se criou conta no aplicativo, use seu e-mail e senha para acompanhar cultos, avisos e recursos da igreja.',
        'Dúvidas podem ser respondidas pelo e-mail cadastrado ou aguardando nosso retorno.',
    ],

];
