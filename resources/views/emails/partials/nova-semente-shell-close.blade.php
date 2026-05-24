@include('emails.partials.brand')
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 8px 0;">
                            <p style="margin:0;font-size:11px;color:{{ $brandColors['text_faint'] ?? '#a1a1aa' }};line-height:1.6;text-align:center;">
                                © {{ date('Y') }} {{ $brandName }} ·
                                <a href="{{ $brandAppUrl }}" style="color:{{ $brandColors['text_muted'] ?? '#52525b' }};text-decoration:underline;">{{ parse_url($brandAppUrl, PHP_URL_HOST) ?: $brandAppUrl }}</a>
                            </p>
                            <p style="margin:8px 0 0;font-size:11px;color:{{ $brandColors['text_faint'] ?? '#a1a1aa' }};line-height:1.5;text-align:center;">
                                {{ config('brand.footer_note') }}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
