<?php

return [

    'trip_professions' => [
        'Médico',
        'Dentista',
        'Enfermeiro',
        'Assistente Social',
        'Nutricionista',
        'Professor',
        'Advogado',
        'Funcionário público',
        'Outro',
    ],

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
        'Outra',
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

    'spiritual_journey' => [
        'Estou conhecendo a fé cristã.',
        'Tenho interesse em crescer espiritualmente.',
        'Já frequento uma igreja.',
        'Estou retornando à vida cristã.',
        'Prefiro não responder.',
    ],

    'comfortable_environment' => [
        'Conversando individualmente.',
        'Pequenos grupos.',
        'Eventos maiores.',
        'Depende da ocasião.',
    ],

    'group_project_preference' => [
        'Organizar e liderar.',
        'Trabalhar em equipe.',
        'Ajudar nos bastidores.',
        'Apoiar onde houver necessidade.',
        'Ainda não sei.',
    ],

    'interest_areas' => [
        'Estudos Bíblicos',
        'Pequenos Grupos',
        'Conviva',
        'Projetos sociais',
        'Missões urbanas',
        'Missões internacionais',
        'Coral ou música',
        'Eventos da igreja',
        'Voluntariado',
    ],

    'learning_style' => [
        'Conversando.',
        'Lendo.',
        'Assistindo.',
        'Participando de atividades.',
        'Um pouco de cada.',
    ],

    'personalized_bible_study_interest' => [
        'Sim.',
        'Talvez futuramente.',
        'Ainda não.',
    ],

    'mission_social_projects_interest' => [
        'Gostaria muito de participar.',
        'Tenho curiosidade.',
        'Talvez no futuro.',
        'Neste momento prefiro apenas conhecer a igreja.',
    ],

    'start_area_preference' => [
        'Crescimento espiritual.',
        'Estudo da Bíblia.',
        'Fazer amizades.',
        'Participar de projetos missionários.',
        'Servir em ações sociais.',
        'Conhecer melhor os ministérios.',
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
        'Enquanto isso, entre na nossa comunidade no WhatsApp. É lá que você receberá comunicados, datas e tudo que acontece no Departamento de Missão.',
        'E não se preocupe, o grupo é fechado, exclusivo para comunicação.',
        'linktr.ee/sent.ns',
        'Até breve.',
        'Equipe SENT',
    ],

];
