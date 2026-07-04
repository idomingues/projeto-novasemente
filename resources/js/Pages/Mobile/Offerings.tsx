import MobileLayout from '@/Layouts/MobileLayout';
import { Head } from '@inertiajs/react';
import {
    BanknotesIcon,
    DocumentDuplicateIcon,
    InformationCircleIcon,
    ArrowTopRightOnSquareIcon,
    BoltIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import { buildPixCopyPaste, parseMoneyInput } from '@/lib/pixPayload';

interface DonationInfo {
    churchName: string | null;
    pix_key: string | null;
    donation_url: string | null;
}

interface LocalOfferInfo {
    pixKey: string;
    merchantName: string;
    merchantCity: string;
}

interface Props {
    donation: DonationInfo;
    localOffer: LocalOfferInfo;
}

const SEVENME_LOGO_SRC = '/images/7me-logo.png';

function donationLinkHost(url: string): string {
    try {
        return new URL(url).host;
    } catch {
        return '';
    }
}

const MAX_OFFER_BRL = 999_999.99;

export default function MobileOfferings({ donation, localOffer }: Props) {
    const [copied, setCopied] = useState(false);
    const [amountRaw, setAmountRaw] = useState('');
    const [pixPayload, setPixPayload] = useState<string | null>(null);
    const [payloadCopied, setPayloadCopied] = useState(false);
    const [amountError, setAmountError] = useState<string | null>(null);
    const donationUrl = donation?.donation_url ?? null;
    const donationHost = donationUrl ? donationLinkHost(donationUrl) : '';
    const pixKeyForOffer = donation.pix_key?.trim() || localOffer.pixKey;
    const hasUrl = Boolean(donationUrl);
    const hasPix = Boolean(pixKeyForOffer);
    const hasOtherMethods = hasPix || hasUrl;

    const copyPix = () => {
        if (!pixKeyForOffer) return;
        navigator.clipboard.writeText(pixKeyForOffer).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const generateLocalPix = () => {
        setAmountError(null);
        setPixPayload(null);
        const amount = parseMoneyInput(amountRaw);
        if (amount === null) {
            setAmountError('Informe um valor válido (ex.: 50 ou 50,20).');
            return;
        }
        if (amount > MAX_OFFER_BRL) {
            setAmountError(`Valor máximo permitido: R$ ${MAX_OFFER_BRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
            return;
        }
        const payload = buildPixCopyPaste({
            pixKey: pixKeyForOffer,
            amount,
            merchantName: localOffer.merchantName,
            merchantCity: localOffer.merchantCity,
        });
        if (!payload) {
            setAmountError('Não foi possível gerar o código. Tente outro valor.');
            return;
        }
        setPixPayload(payload);
    };

    const copyPayload = () => {
        if (!pixPayload) return;
        navigator.clipboard.writeText(pixPayload).then(() => {
            setPayloadCopied(true);
            setTimeout(() => setPayloadCopied(false), 2500);
        });
    };

    return (
        <MobileLayout>
            <Head title="Dízimos e Ofertas" />
            <div className="space-y-6 max-w-3xl mx-auto">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Dízimos e Ofertas</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Sua forma de doação continua a mesma. Se preferir, você também pode abrir o 7me para doar.
                    </p>
                </div>

                {hasUrl && donationUrl && (
                    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
                        <div className="border-b border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <div className="flex shrink-0 items-center justify-center sm:justify-start">
                                    <img
                                        src={SEVENME_LOGO_SRC}
                                        alt="7me"
                                        className="h-9 w-auto max-w-[160px] object-contain object-left"
                                        width={160}
                                        height={36}
                                    />
                                </div>
                                <div className="min-w-0 flex-1 text-center sm:text-left">
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Doar pelo 7me</h2>
                                    <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                        Se você já prefere usar o 7me, abra o link oficial abaixo para concluir sua doação.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 p-4 sm:p-5">
                            <a
                                href={donationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-[0.99] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                            >
                                <span>Abrir 7me para doar</span>
                                <ArrowTopRightOnSquareIcon className="h-4 w-4 opacity-80 group-hover:opacity-100" />
                            </a>
                            {donationHost && (
                                <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
                                    Destino: {donationHost} (nova aba)
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div
                    className="rounded-2xl border border-brand-200/90 bg-gradient-to-br from-brand-50 to-white dark:from-brand-950/45 dark:to-zinc-900 dark:border-brand-900/55 p-4 sm:p-5 shadow-sm"
                    role="note"
                >
                    <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/50">
                            <InformationCircleIcon className="w-5 h-5 text-brand-700 dark:text-brand-300" />
                        </div>
                        <div className="min-w-0 space-y-2">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Igreja local</p>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                Valores com centavos &quot;,20&quot; (ex.: R$ 50,20) indicam que sua oferta será destinada à
                                igreja local.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-sm">
                    <h2 className="font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
                        <BoltIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        ATALHO PIX
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
                        Informe o valor da sua oferta. Geramos o código <strong className="font-medium text-zinc-800 dark:text-zinc-200">PIX Copia e Cola</strong> para você colar no app do banco.
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-3 break-all">
                        Chave PIX: <span className="font-mono text-zinc-700 dark:text-zinc-300">{pixKeyForOffer}</span>
                    </p>
                    <div className="space-y-3">
                        <div>
                            <InputLabel htmlFor="local_offer_amount" value="Valor da oferta (R$)" />
                            <TextInput
                                id="local_offer_amount"
                                type="text"
                                inputMode="decimal"
                                placeholder="Ex.: 50 ou 50,20"
                                value={amountRaw}
                                onChange={(e) => {
                                    setAmountRaw(e.target.value);
                                    setPixPayload(null);
                                    setAmountError(null);
                                }}
                                className="mt-1 block w-full max-w-xs"
                            />
                            {amountError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{amountError}</p>}
                        </div>
                        <PrimaryButton type="button" onClick={generateLocalPix} className="w-full sm:w-auto">
                            Gerar código PIX
                        </PrimaryButton>
                    </div>
                    {pixPayload && (
                        <div className="mt-5 pt-5 border-t border-zinc-200 dark:border-zinc-800">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white mb-2">Código para copiar</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-2">
                                Abra o app do seu banco, escolha PIX Copia e Cola e cole o texto abaixo.
                            </p>
                            <textarea
                                readOnly
                                value={pixPayload}
                                rows={4}
                                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-800 dark:text-zinc-200 break-all"
                                aria-label="Código PIX Copia e Cola"
                            />
                            <button
                                type="button"
                                onClick={copyPayload}
                                className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors"
                            >
                                <DocumentDuplicateIcon className="w-4 h-4" />
                                {payloadCopied ? 'Copiado!' : 'Copiar código'}
                            </button>
                        </div>
                    )}
                </div>

                <>
                    {hasPix && (
                            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-sm">
                                <h2 className="font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                                    <BanknotesIcon className="w-5 h-5 text-zinc-500" />
                                    Chave PIX
                                </h2>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 break-all">
                                    {pixKeyForOffer}
                                </p>
                                <button
                                    type="button"
                                    onClick={copyPix}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-500 transition-colors"
                                >
                                    <DocumentDuplicateIcon className="w-4 h-4" />
                                    {copied ? 'Copiado!' : 'Copiar chave'}
                                </button>
                            </div>
                        )}

                    {!hasOtherMethods && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-2">
                                As formas de doação (chave PIX da igreja e link do 7me) podem ser configuradas no painel da
                                igreja.
                            </p>
                        )}
                </>
            </div>
        </MobileLayout>
    );
}
