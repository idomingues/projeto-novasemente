/**
 * Gera o código PIX Copia e Cola (BR Code EMV) conforme arranjo do Banco Central do Brasil.
 * @see Manual de Padrões para Iniciação do Pix (QR Estático/Dinâmico)
 */

function formatField(id: string, value: string): string {
    const len = String(value.length).padStart(2, '0');
    return id + len + value;
}

/** CRC16-CCITT-FALSE (polinómio 0x1021), usado no campo 63 do PIX. */
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

/** Remove acentos e caracteres não ASCII imprimíveis exigidos em vários apps PIX. */
export function sanitizePixMerchantText(value: string, maxLen: number): string {
    const ascii = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, maxLen);
    return ascii.length > 0 ? ascii : 'DOACAO';
}

export interface PixPayloadOptions {
    /** Chave PIX (e-mail, telefone, EVP ou CPF/CNPJ só dígitos). */
    pixKey: string;
    /** Valor em reais (> 0). */
    amount: number;
    /** Nome do recebedor (máx. 25 caracteres após sanitização). */
    merchantName: string;
    /** Cidade do recebedor (máx. 15 caracteres após sanitização). */
    merchantCity: string;
    /** Identificador da transação (opcional, ex. ***). */
    txid?: string;
}

/**
 * Monta a linha digitável do PIX para colar no app do banco.
 * Usa ponto de iniciação 12 (valor fixo no payload).
 */
export function buildPixCopyPaste(options: PixPayloadOptions): string | null {
    const key = options.pixKey.trim();
    if (!key || options.amount <= 0 || !Number.isFinite(options.amount)) {
        return null;
    }

    const amountStr = options.amount.toFixed(2);
    const name = sanitizePixMerchantText(options.merchantName, 25);
    const city = sanitizePixMerchantText(options.merchantCity, 15);
    const txid = (options.txid ?? '***').substring(0, 25);

    const gui = formatField('00', 'br.gov.bcb.pix');
    const keyField = formatField('01', key);
    const merchantAccount = formatField('26', gui + keyField);

    const additionalData = formatField('05', txid);
    const field62 = formatField('62', additionalData);

    let payload = '';
    payload += formatField('00', '01');
    payload += formatField('01', '12');
    payload += merchantAccount;
    payload += formatField('52', '0000');
    payload += formatField('53', '986');
    payload += formatField('54', amountStr);
    payload += formatField('58', 'BR');
    payload += formatField('59', name);
    payload += formatField('60', city);
    payload += field62;

    payload += '6304';
    const crc = crc16Ccitt(payload + '0000');
    return payload + crc;
}

/** Interpreta valor digitado (vírgula ou ponto como decimal). */
export function parseMoneyInput(raw: string): number | null {
    const t = raw.trim().replace(/\s/g, '');
    if (!t) return null;
    const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
    const n = Number.parseFloat(normalized);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100) / 100;
}
