<?php

namespace App\Support;

use App\Models\TalentListing;

final class TalentListingContact
{
    public static function hasAny(TalentListing $listing): bool
    {
        return self::filled($listing->contact_phone)
            || self::filled($listing->contact_whatsapp)
            || self::filled($listing->contact_email)
            || self::filled($listing->contact_instagram);
    }

    /**
     * @return list<array{key: string, label: string, value: string, href: string}>
     */
    public static function channels(TalentListing $listing): array
    {
        $channels = [];

        if ($phone = trim((string) $listing->contact_phone)) {
            $digits = self::digitsOnly($phone);
            if ($digits !== '') {
                $channels[] = [
                    'key' => 'phone',
                    'label' => 'Telefone',
                    'value' => $phone,
                    'href' => 'tel:+'.$digits,
                ];
            }
        }

        if ($whatsapp = trim((string) $listing->contact_whatsapp)) {
            $digits = self::digitsOnly($whatsapp);
            if ($digits !== '') {
                $channels[] = [
                    'key' => 'whatsapp',
                    'label' => 'WhatsApp',
                    'value' => $whatsapp,
                    'href' => 'https://wa.me/'.$digits,
                ];
            }
        }

        if ($email = trim((string) $listing->contact_email)) {
            $channels[] = [
                'key' => 'email',
                'label' => 'E-mail',
                'value' => $email,
                'href' => 'mailto:'.$email,
            ];
        }

        if ($instagram = trim((string) $listing->contact_instagram)) {
            $handle = ltrim($instagram, '@');
            if ($handle !== '') {
                $channels[] = [
                    'key' => 'instagram',
                    'label' => 'Instagram',
                    'value' => '@'.$handle,
                    'href' => 'https://instagram.com/'.$handle,
                ];
            }
        }

        return $channels;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function hasAnyInPayload(array $data): bool
    {
        return self::filled($data['contact_phone'] ?? null)
            || self::filled($data['contact_whatsapp'] ?? null)
            || self::filled($data['contact_email'] ?? null)
            || self::filled($data['contact_instagram'] ?? null);
    }

    private static function filled(mixed $value): bool
    {
        return is_string($value) && trim($value) !== '';
    }

    private static function digitsOnly(string $value): string
    {
        $digits = preg_replace('/\D+/', '', $value) ?? '';

        if ($digits === '') {
            return '';
        }

        if (! str_starts_with($digits, '55') && strlen($digits) <= 11) {
            return '55'.$digits;
        }

        return $digits;
    }
}
