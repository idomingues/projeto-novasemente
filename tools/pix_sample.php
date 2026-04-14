<?php

declare(strict_types=1);

function formatField(string $id, string $value): ?string
{
    if (strlen($value) > 99) {
        return null;
    }
    $len = str_pad((string) strlen($value), 2, '0', STR_PAD_LEFT);
    if (strlen($len) !== 2) {
        return null;
    }
    return $id.$len.$value;
}

function sanitizePixMerchantText(string $value, int $maxLen, string $fallback = 'DOACAO'): string
{
    $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if (!is_string($ascii)) {
        $ascii = '';
    }
    $ascii = preg_replace('/[^a-zA-Z0-9 ]/', ' ', $ascii) ?? '';
    $ascii = preg_replace('/\s+/', ' ', trim($ascii)) ?? '';
    $ascii = substr($ascii, 0, $maxLen);
    return $ascii !== '' ? $ascii : $fallback;
}

function crc16CcittFalse(string $payload): string
{
    $crc = 0xFFFF;
    $len = strlen($payload);
    for ($i = 0; $i < $len; $i++) {
        $crc ^= (ord($payload[$i]) << 8);
        for ($j = 0; $j < 8; $j++) {
            if ($crc & 0x8000) {
                $crc = (($crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                $crc = ($crc << 1) & 0xFFFF;
            }
        }
    }
    return strtoupper(str_pad(dechex($crc), 4, '0', STR_PAD_LEFT));
}

$pixKey = 'novasemente.ap@adventistas.org';
$amount = 1.00;
$merchantName = 'UNIAO CENTRAL BRASILEIRA';
$merchantCity = 'SAO PAULO';

$name = sanitizePixMerchantText($merchantName, 25, 'DOACAO');
$city = sanitizePixMerchantText($merchantCity, 15, 'BRASILIA');

$gui = formatField('00', 'BR.GOV.BCB.PIX');
$keyField = formatField('01', trim($pixKey));
$inner26 = ($gui ?? '').($keyField ?? '');
$merchantAccount = formatField('26', $inner26);

$f00 = formatField('00', '01');
$f01 = formatField('01', '11');
$f52 = formatField('52', '0000');
$f53 = formatField('53', '986');
$f54 = formatField('54', number_format($amount, 2, '.', ''));
$f58 = formatField('58', 'BR');
$f59 = formatField('59', $name);
$f60 = formatField('60', $city);
$txid = formatField('05', '***');
$f62 = formatField('62', $txid ?? '');

$payload = ($f00 ?? '').($f01 ?? '').($merchantAccount ?? '').($f52 ?? '').($f53 ?? '').($f54 ?? '').($f58 ?? '').($f59 ?? '').($f60 ?? '').($f62 ?? '').'6304';
$payload .= crc16CcittFalse($payload);

echo $payload.PHP_EOL;

