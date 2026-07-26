export type NsWhatsMessagePayload = {
    id: number;
    authorUserId?: number | null;
    authorRole: string;
    authorName?: string | null;
    body: string;
    kind: string;
    editedAt?: string | null;
    createdAt?: string | null;
    isInternal?: boolean;
    isSystem?: boolean;
};

export type NsWhatsConversationPayload = {
    id: number;
    subject?: string | null;
    status: string;
    statusLabel: string;
    ministryName?: string | null;
    assigneeName?: string | null;
    canChat: boolean;
    canReopen: boolean;
    lastActivityAt?: string | null;
    unreadCount: number;
    lastPreview: string;
    messages: NsWhatsMessagePayload[];
    headerTitle: string;
    headerSubtitle: string;
    headerPhotoUrl?: string | null;
};

export type NsWhatsSendResult =
    | { ok: true; message: NsWhatsMessagePayload }
    | { ok: false; error: string };

export type NsWhatsLoadConversationResult =
    | { ok: true; conversation: NsWhatsConversationPayload }
    | { ok: false; error: string };

function csrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

/**
 * Envia mensagem via fetch (JSON), sem visita Inertia / reload da página.
 */
export async function sendNsWhatsMessage(url: string, content: string): Promise<NsWhatsSendResult> {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ content }),
    });

    if (res.status === 422) {
        try {
            const body = (await res.json()) as { errors?: Record<string, string[]>; message?: string };
            const first = body.errors?.content?.[0] ?? body.message ?? 'Mensagem inválida.';
            return { ok: false, error: first };
        } catch {
            return { ok: false, error: 'Mensagem inválida.' };
        }
    }

    if (!res.ok) {
        return { ok: false, error: 'Não foi possível enviar. Tente novamente.' };
    }

    try {
        const body = (await res.json()) as { message?: NsWhatsMessagePayload };
        if (!body.message) {
            return { ok: false, error: 'Resposta inválida do servidor.' };
        }
        return { ok: true, message: body.message };
    } catch {
        return { ok: false, error: 'Resposta inválida do servidor.' };
    }
}

/**
 * Carrega uma conversa via fetch (JSON), sem visita Inertia.
 */
export async function loadNsWhatsConversation(url: string): Promise<NsWhatsLoadConversationResult> {
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
    });

    if (!res.ok) {
        return { ok: false, error: 'Não foi possível abrir a conversa.' };
    }

    try {
        const body = (await res.json()) as { conversation?: NsWhatsConversationPayload };
        if (!body.conversation) {
            return { ok: false, error: 'Resposta inválida do servidor.' };
        }
        return { ok: true, conversation: body.conversation };
    } catch {
        return { ok: false, error: 'Resposta inválida do servidor.' };
    }
}
