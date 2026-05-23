<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Driver de leitura de comprovantes
    |--------------------------------------------------------------------------
    |
    | local — Tesseract no servidor (grátis; requer binário `tesseract` instalado)
    | vision — reservado para integração futura com API de visão
    |
    */
    'driver' => env('RECEIPT_OCR_DRIVER', 'local'),

    'tesseract_path' => env('TESSERACT_PATH', 'tesseract'),

    'tesseract_lang' => env('TESSERACT_LANG', 'por'),

];
