/**
 * Gera o código PIX Copia e Cola (BR Code EMV) conforme arranjo do Banco Central do Brasil.
 * @see Manual de Padrões para Iniciação do Pix (QR Estático/Dinâmico)
 */

function formatField(id: string, value: string): string | null {
    if (value.length > 99) {
        return null;
    }
    const len = String(value.length).padStart(2, '0');
    if (len.length !== 2) {
        return null;
    }
    return id + len + value;
}

/** CRC16-CCITT-FALSE (polinómio 0x1021, inicial 0xFFFF), campo 63 do PIX. */
function crc16Ccitt(payload: string): string {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
            crc &= 0xffff;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function isValidCpfDigits(d: string): boolean {
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) {
        return false;
    }
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(d[i]!, 10) * (10 - i);
    }
    let r = (sum * 10) % 11;
    if (r === 10) {
        r = 0;
    }
    if (r !== parseInt(d[9]!, 10)) {
        return false;
    }
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(d[i]!, 10) * (11 - i);
    }
    r = (sum * 10) % 11;
    if (r === 10) {
        r = 0;
    }
    return r === parseInt(d[10]!, 10);
}

/**
 * Normaliza a chave PIX para o formato esperado no EMV (BCB).
 * - E-mail: minúsculas.
 * - Telefone: E.164 (+55…) quando aplicável.
 * - CPF/CNPJ: só dígitos.
 * - EVP (UUID): minúsculas.
 */
export function normalizePixKey(raw: string): string {
    const k = raw.trim();
    if (!k) {
        return '';
    }
    const lower = k.toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
        return lower;
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) {
        return lower;
    }

    const digits = k.replace(/\D/g, '');
    if (digits.length === 14) {
        return digits;
    }
    if (digits.length >= 12 && digits.startsWith('55')) {
        return `+${digits}`;
    }
    if (digits.length === 11) {
        if (isValidCpfDigits(digits)) {
            return digits;
        }
        return `+55${digits}`;
    }
    if (digits.length === 10) {
        return `+55${digits}`;
    }
    return k;
}

/** Remove acentos e caracteres não ASCII imprimíveis exigidos em vários apps PIX. */
export function sanitizePixMerchantText(value: string, maxLen: number, fallback = 'DOACAO'): string {
    const ascii = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, maxLen);
    return ascii.length > 0 ? ascii : fallback;
}

export interface PixPayloadOptions {
    /** Chave PIX (e-mail, telefone E.164, EVP ou CPF/CNPJ só dígitos). */
    pixKey: string;
    /** Valor em reais (> 0). */
    amount: number;
    /** Nome do recebedor (máx. 25 caracteres após sanitização). */
    merchantName: string;
    /** Cidade do recebedor (máx. 15 caracteres após sanitização). */
    merchantCity: string;
}

/** MCC usado em muitos geradores PIX (6012); 0000 costuma ser recusado por alguns apps. */
const PIX_MCC = '6012';

/**
 * Monta a linha digitável do PIX para colar no app do banco (QR estático EMV).
 * Campo 01 = 11 (estático). O valor em R$ vai no campo 54; usar 12 seria QR dinâmico
 * (cobrança com URL/txid) e quebra em vários bancos sem os campos 25/62 adequados.
 * Campo 62 omitido (opcional no estático).
 */
export function buildPixCopyPaste(options: PixPayloadOptions): string | null {
    const key = normalizePixKey(options.pixKey);
    if (!key || options.amount <= 0 || !Number.isFinite(options.amount)) {
        return null;
    }

    const amountRounded = Math.round(options.amount * 100) / 100;
    const amountStr = amountRounded.toFixed(2);
    if (!/^\d+\.\d{2}$/.test(amountStr)) {
        return null;
    }

    const name = sanitizePixMerchantText(options.merchantName, 25);
    const city = sanitizePixMerchantText(options.merchantCity, 15, 'BRASILIA');

    const gui = formatField('00', 'br.gov.bcb.pix');
    const keyField = formatField('01', key);
    if (!gui || !keyField) {
        return null;
    }
    const inner26 = gui + keyField;
    if (inner26.length > 99) {
        return null;
    }
    const merchantAccount = formatField('26', inner26);
    if (!merchantAccount) {
        return null;
    }

    const f52 = formatField('52', PIX_MCC);
    const f53 = formatField('53', '986');
    const f54 = formatField('54', amountStr);
    const f58 = formatField('58', 'BR');
    const f59 = formatField('59', name);
    const f60 = formatField('60', city);
    if (!f52 || !f53 || !f54 || !f58 || !f59 || !f60) {
        return null;
    }

    let payload = '';
    const f00 = formatField('00', '01');
    /** 11 = QR estático (copia e cola com chave + valor no payload). Não usar 12 aqui. */
    const f01 = formatField('01', '11');
    if (!f00 || !f01) {
        return null;
    }
    payload += f00;
    payload += f01;
    payload += merchantAccount;
    payload += f52;
    payload += f53;
    payload += f54;
    payload += f58;
    payload += f59;
    payload += f60;

    // Additional Data Field Template (62): include TXID.
    // Some bank apps reject static payloads without a TXID; the BCB guidance allows using "***" for static QR.
    const txid = formatField('05', '***');
    if (!txid) {
        return null;
    }
    const f62 = formatField('62', txid);
    if (!f62) {
        return null;
    }
    payload += f62;

    payload += '6304';
    const crc = crc16Ccitt(payload + '0000');
    return payload + crc;
}

/** Interpreta valor digitado (vírgula ou ponto como decimal). */
export function parseMoneyInput(raw: string): number | null {
    const t = raw.trim().replace(/\s/g, '');
    if (!t) {
        return null;
    }
    const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
    const n = Number.parseFloat(normalized);
    if (!Number.isFinite(n) || n <= 0) {
        return null;
    }
    return Math.round(n * 100) / 100;
}
