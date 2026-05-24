@include('emails.partials.brand')
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{{ $pageTitle ?? $brandName }}</title>
</head>
<body style="margin:0;padding:0;background-color:{{ $brandColors['background'] ?? '#f4f4f5' }};font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:{{ $brandColors['background'] ?? '#f4f4f5' }};padding:28px 14px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;">
                    <tr>
                        <td style="padding:0 8px 16px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="vertical-align:middle;width:52px;">
                                        <a href="{{ $brandAppUrl }}" style="text-decoration:none;">
                                            <img src="{{ $brandLogoUrl }}" width="48" height="48" alt="{{ $brandName }}" style="display:block;border-radius:999px;border:2px solid {{ $brandColors['border'] ?? '#e4e4e7' }};">
                                        </a>
                                    </td>
                                    <td style="vertical-align:middle;padding-left:12px;">
                                        <div style="font-size:15px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:{{ $brandColors['text'] ?? '#18181b' }};">
                                            {{ $brandName }}
                                        </div>
                                        @if($brandTagline !== '')
                                            <div style="font-size:12px;color:{{ $brandColors['text_muted'] ?? '#52525b' }};margin-top:2px;">
                                                {{ $brandTagline }}
                                            </div>
                                        @endif
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{{ $brandColors['surface'] ?? '#ffffff' }};border-radius:18px;overflow:hidden;border:1px solid {{ $brandColors['border'] ?? '#e4e4e7' }};box-shadow:0 1px 3px rgba(0,0,0,.06);">
