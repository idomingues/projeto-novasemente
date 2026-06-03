import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import SelectInput from '@/Components/SelectInput';
import NewsPostCover from '@/Components/News/NewsPostCover';
import { EVENT_COVER_SPECS } from '@/constants/mediaCoverSpecs';
import { PhotoIcon, TicketIcon } from '@heroicons/react/24/outline';
import { FormEventHandler } from 'react';
import { GALLERY_IMAGE_ACCEPT } from '@/utils/mobilePhotoPick';
import type { EventItemForAdmin } from '@/Components/Events/eventAdminTypes';
import {
    EVENT_COLOR_PRESETS,
    colorPickerSafeValue,
    imageSrc,
    normalizeHexColor,
    toDateInputValue,
    toDatetimeLocalString,
} from '@/Components/Events/eventAdminTypes';

export type EventVideoType = '' | 'youtube' | 'instagram';

export type EventAdminFormData = {
    title: string;
    description: string;
    starts_at: string;
    ends_at: string;
    all_day: boolean;
    location: string;
    price: string;
    purchase_url: string;
    video_type: EventVideoType;
    video_url: string;
    image_url: string;
    image_file: File | null;
    color: string;
};

type SetDataFn = <K extends keyof EventAdminFormData>(
    key: K,
    value: EventAdminFormData[K],
) => void;

interface Props {
    show: boolean;
    onClose: () => void;
    isEditing: boolean;
    data: EventAdminFormData;
    setData: SetDataFn;
    errors: Partial<Record<keyof EventAdminFormData | 'image_file', string>>;
    processing: boolean;
    onSubmit: FormEventHandler;
    appUrl: string;
}

export function eventFormDataFromItem(ev: EventItemForAdmin): EventAdminFormData {
    const start = new Date(ev.starts_at);
    const end = ev.ends_at ? new Date(ev.ends_at) : null;

    return {
        title: ev.title,
        description: ev.description ?? '',
        starts_at: ev.all_day ? toDateInputValue(start) : toDatetimeLocalString(start),
        ends_at: end
            ? ev.all_day
                ? toDateInputValue(end)
                : toDatetimeLocalString(end)
            : '',
        all_day: ev.all_day,
        location: ev.location ?? '',
        price: ev.price ?? '',
        purchase_url: ev.purchase_url ?? '',
        video_type: (ev.video_type ?? '') as EventVideoType,
        video_url: ev.video_url ?? '',
        image_url: ev.image_url ?? '',
        image_file: null,
        color: ev.color ?? '',
    };
}

export function defaultEventFormData(startsAt?: Date): EventAdminFormData {
    const start = startsAt ?? new Date();
    start.setMinutes(0, 0, 0);

    return {
        title: '',
        description: '',
        starts_at: toDatetimeLocalString(start),
        ends_at: '',
        all_day: false,
        location: '',
        price: '',
        purchase_url: '',
        video_type: '',
        video_url: '',
        image_url: '',
        image_file: null,
        color: '',
    };
}

export default function EventAdminModal({
    show,
    onClose,
    isEditing,
    data,
    setData,
    errors,
    processing,
    onSubmit,
    appUrl,
}: Props) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <form onSubmit={onSubmit} className="p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    {isEditing ? 'Editar evento' : 'Novo evento'}
                </h2>
                <div className="space-y-4">
                    <div>
                        <InputLabel htmlFor="event_title">Título *</InputLabel>
                        <TextInput
                            id="event_title"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className="mt-1 block w-full"
                            required
                        />
                        <InputError message={errors.title} />
                    </div>
                    <div>
                        <InputLabel htmlFor="event_description">Descrição</InputLabel>
                        <Textarea
                            id="event_description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            className="mt-1 block w-full"
                            rows={3}
                        />
                        <InputError message={errors.description} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="event_starts_at">Início *</InputLabel>
                            <TextInput
                                id="event_starts_at"
                                type={data.all_day ? 'date' : 'datetime-local'}
                                value={data.all_day ? data.starts_at.slice(0, 10) : data.starts_at}
                                onChange={(e) => setData('starts_at', e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                            <InputError message={errors.starts_at} />
                        </div>
                        <div>
                            <InputLabel htmlFor="event_ends_at">Fim (opcional)</InputLabel>
                            <TextInput
                                id="event_ends_at"
                                type={data.all_day ? 'date' : 'datetime-local'}
                                value={
                                    data.ends_at
                                        ? data.all_day
                                            ? data.ends_at.slice(0, 10)
                                            : data.ends_at
                                        : ''
                                }
                                onChange={(e) => setData('ends_at', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Deixe em branco se o evento não tiver horário de término.
                            </p>
                            <InputError message={errors.ends_at} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="event_all_day"
                            checked={data.all_day}
                            onChange={(e) => setData('all_day', e.target.checked)}
                            className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <InputLabel htmlFor="event_all_day" className="!mb-0">
                            Evento o dia todo
                        </InputLabel>
                    </div>
                    <div>
                        <InputLabel htmlFor="event_location">Local</InputLabel>
                        <TextInput
                            id="event_location"
                            value={data.location}
                            onChange={(e) => setData('location', e.target.value)}
                            className="mt-1 block w-full"
                        />
                        <InputError message={errors.location} />
                    </div>
                    <div>
                        <InputLabel htmlFor="event_price">Valor e condições (texto livre, opcional)</InputLabel>
                        <Textarea
                            id="event_price"
                            value={data.price}
                            onChange={(e) => setData('price', e.target.value)}
                            className="mt-1 block w-full"
                            rows={3}
                            placeholder="Ex.: R$ 50 + 1 kg de alimento · Meia entrada R$ 25 · Grátis"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Aparece só no detalhe do evento no app (não no card da lista pública).
                        </p>
                        <InputError message={errors.price} />
                    </div>
                    <div className="rounded-xl border-2 border-primary-500/35 bg-primary-50/80 p-4 shadow-sm dark:border-primary-500/40 dark:bg-primary-950/30">
                        <div className="mb-2 flex items-center gap-2 text-primary-900 dark:text-primary-100">
                            <TicketIcon className="h-5 w-5 shrink-0" />
                            <span className="text-sm font-bold uppercase tracking-wide">Link para compra</span>
                        </div>
                        <p className="mb-3 text-xs text-primary-950/80 dark:text-primary-100/80">
                            Destaque no app: botão que leva à página de ingressos, inscrição ou pagamento (cole o URL
                            completo, incluindo https://).
                        </p>
                        <InputLabel htmlFor="event_purchase_url" className="text-primary-950 dark:text-primary-50">
                            URL de compra ou inscrição
                        </InputLabel>
                        <TextInput
                            id="event_purchase_url"
                            type="url"
                            value={data.purchase_url}
                            onChange={(e) => setData('purchase_url', e.target.value)}
                            className="mt-1 block w-full border-primary-200 bg-white dark:border-primary-800/60 dark:bg-zinc-900"
                            placeholder="https://..."
                        />
                        <InputError message={errors.purchase_url} />
                    </div>
                    <div>
                        <InputLabel htmlFor="event_video_type" value="Vídeo do evento (opcional)" />
                        <SelectInput
                            id="event_video_type"
                            value={data.video_type}
                            className="mt-1"
                            onChange={(e) => {
                                const next = e.target.value as EventVideoType;
                                setData('video_type', next);
                                if (next === '') {
                                    setData('video_url', '');
                                }
                            }}
                        >
                            <option value="">Sem vídeo</option>
                            <option value="youtube">YouTube</option>
                            <option value="instagram">Instagram</option>
                        </SelectInput>
                        <InputError message={errors.video_type} className="mt-1" />
                    </div>
                    {data.video_type === 'youtube' && (
                        <div>
                            <InputLabel htmlFor="event_video_url_youtube" value="Link do YouTube" />
                            <TextInput
                                id="event_video_url_youtube"
                                value={data.video_url}
                                onChange={(e) => setData('video_url', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="https://www.youtube.com/watch?v=… ou https://youtu.be/…"
                            />
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Na app, a capa exibe o ícone de play e o vídeo abre no detalhe do evento.
                            </p>
                            <InputError message={errors.video_url} className="mt-1" />
                        </div>
                    )}
                    {data.video_type === 'instagram' && (
                        <div>
                            <InputLabel htmlFor="event_video_url_instagram" value="Link do Instagram" />
                            <TextInput
                                id="event_video_url_instagram"
                                value={data.video_url}
                                onChange={(e) => setData('video_url', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="https://www.instagram.com/p/… ou …/reel/…"
                            />
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Na app, a capa exibe o ícone de play e abre o vídeo no Instagram.
                            </p>
                            <InputError message={errors.video_url} className="mt-1" />
                        </div>
                    )}
                    <div>
                        <InputLabel htmlFor="event_image_url">Imagem de capa / fundo</InputLabel>
                        <p
                            id="event_cover_specs"
                            className="mt-1.5 rounded-xl border border-teal-200/80 bg-teal-50 px-3 py-2 text-xs leading-relaxed text-teal-950 dark:border-teal-900/50 dark:bg-teal-950/35 dark:text-teal-100"
                        >
                            <span className="font-semibold">Capa no app:</span> {EVENT_COVER_SPECS}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Envie um arquivo ou cole o link da imagem.
                        </p>
                        <div className="mt-2 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
                                    {data.image_file ? (
                                        <img
                                            src={URL.createObjectURL(data.image_file)}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    ) : data.image_url ? (
                                        <img
                                            src={imageSrc(data.image_url, appUrl)}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <PhotoIcon className="h-5 w-5 text-zinc-500" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <input
                                        id="event_image_file"
                                        type="file"
                                        accept={GALLERY_IMAGE_ACCEPT}
                                        aria-describedby="event_cover_specs"
                                        onChange={(e) => {
                                            setData('image_file', e.target.files?.[0] ?? null);
                                        }}
                                        className="block w-full text-sm text-zinc-900 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800 dark:text-zinc-100 dark:file:bg-zinc-100 dark:file:text-zinc-900"
                                    />
                                    <TextInput
                                        id="event_image_url"
                                        value={data.image_url}
                                        onChange={(e) => setData('image_url', e.target.value)}
                                        className="block w-full"
                                        placeholder="Ou URL https://..."
                                    />
                                </div>
                            </div>
                        </div>
                        <InputError message={errors.image_url} />
                        <InputError message={errors.image_file} />
                    </div>
                    {(data.image_file || data.image_url) && data.video_type && data.video_url.trim() && (
                        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                            <p className="border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                                Pré-visualização na app
                            </p>
                            <NewsPostCover
                                imageSrc={
                                    data.image_file
                                        ? URL.createObjectURL(data.image_file)
                                        : imageSrc(data.image_url, appUrl)
                                }
                                instagramVideoUrl={data.video_type === 'instagram' ? data.video_url : null}
                                showYoutubePlayOverlay={data.video_type === 'youtube'}
                            />
                        </div>
                    )}
                    <div>
                        <InputLabel htmlFor="event_color">Cor do evento</InputLabel>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            Toque numa cor sugerida, use o seletor ou escreva o código hex (ex.: #3B82F6).
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {EVENT_COLOR_PRESETS.map((hex) => {
                                const active = normalizeHexColor(data.color) === hex;
                                return (
                                    <button
                                        key={hex}
                                        type="button"
                                        title={hex}
                                        onClick={() => setData('color', hex)}
                                        className={`h-9 w-9 shrink-0 rounded-full border-2 border-white shadow-sm ring-offset-2 transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-900 dark:ring-offset-zinc-950 ${
                                            active ? 'ring-2 ring-zinc-900 dark:ring-white' : 'ring-0'
                                        }`}
                                        style={{ backgroundColor: hex }}
                                        aria-label={`Cor ${hex}`}
                                        aria-pressed={active}
                                    />
                                );
                            })}
                            <label className="ml-1 flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Mais</span>
                                <input
                                    type="color"
                                    className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                                    value={colorPickerSafeValue(data.color)}
                                    onChange={(e) => setData('color', e.target.value.toUpperCase())}
                                    aria-label="Escolher cor personalizada"
                                />
                            </label>
                        </div>
                        <TextInput
                            id="event_color"
                            value={data.color}
                            onChange={(e) => setData('color', e.target.value)}
                            className="mt-2 block w-full font-mono text-sm"
                            placeholder="#3B82F6"
                            autoComplete="off"
                        />
                        <InputError message={errors.color} />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <SecondaryButton type="button" onClick={onClose}>
                        Cancelar
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={processing}>
                        {isEditing ? 'Salvar' : 'Criar'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
