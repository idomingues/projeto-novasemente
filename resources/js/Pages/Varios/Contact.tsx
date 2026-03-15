import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';

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
    const whatsappLink = contact?.whatsapp
        ? `https://wa.me/${cleanWhatsAppNumber(contact.whatsapp)}`
        : null;

    return (
        <AdminLayout>
            <Head title="Fale conosco" />
            <div className="space-y-4 sm:space-y-6">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Fale conosco</h1>
                {!contact ? (
                    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
                        <p className="text-zinc-500 dark:text-zinc-400">
                            Informações de contato não disponíveis.
                        </p>
                    </div>
                ) : (
                    <div className="max-w-xl">
                        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
                            <h2 className="font-semibold text-zinc-900 dark:text-white mb-4">
                                {contact.name}
                            </h2>
                            <div className="space-y-3">
                                {contact.address && (
                                    <a
                                        href={`https://maps.google.com/?q=${encodeURIComponent(contact.address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                                    >
                                        <MapPinIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm">{contact.address}</span>
                                    </a>
                                )}
                                {(contact.city || contact.state) && (
                                    <div className="flex items-start gap-3 text-zinc-600 dark:text-zinc-400">
                                        <MapPinIcon className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-0" />
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
                                        <EnvelopeIcon className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-sm">{contact.email}</span>
                                    </a>
                                )}
                                {contact.phone && !whatsappLink && (
                                    <a
                                        href={`tel:${contact.phone.replace(/\D/g, '')}`}
                                        className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                                    >
                                        <PhoneIcon className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-sm">{contact.phone}</span>
                                    </a>
                                )}
                                {whatsappLink && (
                                    <a
                                        href={whatsappLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                                    >
                                        <PhoneIcon className="w-5 h-5" />
                                        WhatsApp
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
