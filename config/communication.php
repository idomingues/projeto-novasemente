<?php

return [

    /*
    |--------------------------------------------------------------------------
    | E-mail ao abrir solicitação de comunicação
    |--------------------------------------------------------------------------
    */
    'notify_email' => env('COMMUNICATION_REQUEST_NOTIFY_EMAIL', 'patyasd@gmail.com'),

    'max_attachments' => (int) env('COMMUNICATION_REQUEST_MAX_ATTACHMENTS', 8),

    /** Tamanho máximo por arquivo (KB). */
    'max_attachment_kb' => (int) env('COMMUNICATION_REQUEST_MAX_ATTACHMENT_KB', 10240),

];
