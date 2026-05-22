<?php

return [
    /** Janela (minutos) para considerar uma sessão de base de dados como «ativa». */
    'session_active_minutes' => (int) env('OPERATIONS_SESSION_ACTIVE_MINUTES', 5),

    /** Apagar eventos de login mais antigos que isto (dias). Comando `auth:prune-login-events`. */
    'login_events_retention_days' => (int) env('OPERATIONS_LOGIN_EVENTS_RETENTION_DAYS', 90),

    /** Máximo de tentativas falhadas por combinação login+IP antes do bloqueio temporário. */
    'login_max_attempts_per_identity' => (int) env('LOGIN_MAX_ATTEMPTS', 5),

    /** Segundos de bloqueio após exceder tentativas por identidade (login+IP). */
    'login_decay_seconds' => (int) env('LOGIN_DECAY_SECONDS', 900),

    /** Máximo de tentativas por endereço IP (todas as contas) na mesma janela. */
    'login_max_attempts_per_ip' => (int) env('LOGIN_MAX_ATTEMPTS_PER_IP', 40),

    /** Janela do limite por IP (segundos). */
    'login_ip_decay_seconds' => (int) env('LOGIN_IP_DECAY_SECONDS', 900),

    /** Meses disponíveis no seletor da aba «Páginas mais acessadas» (Operações). */
    'page_views_months' => (int) env('OPERATIONS_PAGE_VIEWS_MONTHS', 12),
];
