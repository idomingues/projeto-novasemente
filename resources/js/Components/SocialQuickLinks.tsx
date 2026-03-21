import { CHURCH_INSTAGRAM_URL, CHURCH_WHATSAPP_INSTAGRAM_POST_URL } from '@/constants/churchSocial';
import { InstagramBrandIcon, WhatsAppBrandIcon } from '@/Components/SocialBrandIcons';

function cleanWhatsAppNumber(num: string): string {
    return num.replace(/\D/g, '').replace(/^0/, '55');
}

interface Props {
    /** Se preenchido, abre wa.me; senão usa o post do Instagram com o link do WhatsApp. */
    churchWhatsapp?: string | null;
    className?: string;
}

export default function SocialQuickLinks({ churchWhatsapp, className = '' }: Props) {
    const whatsAppHref = churchWhatsapp?.trim()
        ? `https://wa.me/${cleanWhatsAppNumber(churchWhatsapp)}`
        : CHURCH_WHATSAPP_INSTAGRAM_POST_URL;

    return (
        <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
            <a
                href={whatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition-colors hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-900/50"
            >
                <WhatsAppBrandIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                WhatsApp
            </a>
            <a
                href={CHURCH_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
            >
                <InstagramBrandIcon className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                Instagram
            </a>
        </div>
    );
}
