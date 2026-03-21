import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { CHURCH_INSTAGRAM_URL, CHURCH_WHATSAPP_INSTAGRAM_POST_URL } from '@/constants/churchSocial';
import { InstagramBrandIcon, WhatsAppBrandIcon } from '@/Components/SocialBrandIcons';

interface ContactInfo {
    name: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
}

interface Props {
    contact: ContactInfo | null;
}

function cleanWhatsAppNumber(num: string | null): string {
    if (!num) return '';
    return num.replace(/\D/g, '').replace(/^0/, '55');
}

export default function VariosContact({ contact }: Props) {
    const whatsappDirectLink = contact?.whatsapp
        ? `https://wa.me/${cleanWhatsAppNumber(contact.whatsapp)}`
        : null;

    return (
        <AdminLayout>
            <Head title="Fale conosco" />
            <div className="space-y-6">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white sm:text-2xl">Fale conosco</h1>

                <div className="grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
                    <a
                        href={CHURCH_WHATSAPP_INSTAGRAM_POST_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
                    >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                            <WhatsAppBrandIcon className="h-7 w-7" />
                        </div>
                        <div className="min-w-0">
                            <span className="font-semibold text-zinc-900 dark:text-white">WhatsApp</span>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Link no post oficial do Instagram
                            </p>
                        </div>
                    </a>
                    <a
                        href={CHURCH_INSTAGRAM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-pink-300 hover:bg-pink-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-pink-800 dark:hover:bg-pink-950/20"
                    >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white">
                            <InstagramBrandIcon className="h-7 w-7" />
                        </div>
                        <div className="min-w-0">
                            <span className="font-semibold text-zinc-900 dark:text-white">Instagram</span>
                            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">@novasemente</p>
                        </div>
                    </a>
                </div>

                {!contact ? (
                    <div className="max-w-xl rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                        <p className="text-zinc-500 dark:text-zinc-400">
                            Demais informações de contato não estão disponíveis.
                        </p>
                    </div>
                ) : (
                    <div className="max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="space-y-3">
                            {whatsappDirectLink && (
                                <a
                                    href={whatsappDirectLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 sm:w-auto"
                                >
                                    <WhatsAppBrandIcon className="h-5 w-5" />
                                    Abrir WhatsApp (número da igreja)
                                </a>
                            )}
                            {contact.address && (
                                <a
                                    href={`https://maps.google.com/?q=${encodeURIComponent(contact.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                                >
                                    <MapPinIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                    <span className="text-sm">{contact.address}</span>
                                </a>
                            )}
                            {(contact.city || contact.state) && (
                                <div className="flex items-start gap-3 text-zinc-600 dark:text-zinc-400">
                                    <MapPinIcon className="mt-0.5 h-5 w-5 flex-shrink-0 opacity-0" />
                                    <span className="text-sm">
                                        {[contact.city, contact.state].filter(Boolean).join(', ')}
                                    </span>
                                </div>
                            )}
                            {contact.email && (
                                <a
                                    href={`mailto:${contact.email}`}
                                    className="flex items-center gap-3 text-zinc-900 dark:text-white hover:underline"
                                >
                                    <EnvelopeIcon className="h-5 w-5 flex-shrink-0" />
                                    <span className="text-sm">{contact.email}</span>
                                </a>
                            )}
                            {contact.phone && !whatsappDirectLink && (
                                <a
                                    href={`tel:${contact.phone.replace(/\D/g, '')}`}
                                    className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                                >
                                    <PhoneIcon className="h-5 w-5 flex-shrink-0" />
                                    <span className="text-sm">{contact.phone}</span>
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
