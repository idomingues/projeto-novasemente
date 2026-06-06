import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';

export type TalentListingContactFormData = {
    contact_phone: string;
    contact_whatsapp: string;
    contact_email: string;
    contact_instagram: string;
};

type ContactErrors = Partial<Record<keyof TalentListingContactFormData | 'contact_whatsapp', string>>;

type Props = {
    data: TalentListingContactFormData;
    setData: (key: keyof TalentListingContactFormData, value: string) => void;
    errors?: ContactErrors;
    idPrefix?: string;
};

export default function TalentListingContactFields({ data, setData, errors = {}, idPrefix = 'tc_contact' }: Props) {
    return (
        <div className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900/60 dark:bg-brand-950/20">
            <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Contato para divulgação</h3>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Informe como as pessoas podem falar com você. Pelo menos um canal é obrigatório.
                </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <InputLabel htmlFor={`${idPrefix}_whatsapp`} value="WhatsApp" />
                    <TextInput
                        id={`${idPrefix}_whatsapp`}
                        className="mt-1 w-full"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={data.contact_whatsapp}
                        onChange={(e) => setData('contact_whatsapp', e.target.value)}
                    />
                    <InputError message={errors.contact_whatsapp} className="!mt-1" />
                </div>
                <div>
                    <InputLabel htmlFor={`${idPrefix}_phone`} value="Telefone" />
                    <TextInput
                        id={`${idPrefix}_phone`}
                        className="mt-1 w-full"
                        type="tel"
                        placeholder="(11) 3333-4444"
                        value={data.contact_phone}
                        onChange={(e) => setData('contact_phone', e.target.value)}
                    />
                    <InputError message={errors.contact_phone} className="!mt-1" />
                </div>
                <div>
                    <InputLabel htmlFor={`${idPrefix}_email`} value="E-mail" />
                    <TextInput
                        id={`${idPrefix}_email`}
                        className="mt-1 w-full"
                        type="email"
                        placeholder="seu@email.com"
                        value={data.contact_email}
                        onChange={(e) => setData('contact_email', e.target.value)}
                    />
                    <InputError message={errors.contact_email} className="!mt-1" />
                </div>
                <div>
                    <InputLabel htmlFor={`${idPrefix}_instagram`} value="Instagram" />
                    <TextInput
                        id={`${idPrefix}_instagram`}
                        className="mt-1 w-full"
                        placeholder="@seu_perfil"
                        value={data.contact_instagram}
                        onChange={(e) => setData('contact_instagram', e.target.value)}
                    />
                    <InputError message={errors.contact_instagram} className="!mt-1" />
                </div>
            </div>
        </div>
    );
}
