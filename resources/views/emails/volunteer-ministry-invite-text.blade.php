{{-- Corpo text/plain (multipart) — mesmo conteúdo que o bloco principal do HTML. --}}
@php
    $body = str_replace(["\r\n", "\r"], "\n", trim((string) ($plainCopySection ?? '')));
    echo str_replace("\0", '', $body);
@endphp
