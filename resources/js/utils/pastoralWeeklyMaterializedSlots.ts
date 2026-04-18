import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import 'dayjs/locale/pt';
import isoWeek from 'dayjs/plugin/isoWeek';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);
dayjs.locale('pt');

export type ScheduleRowInput = {
    weekday: number;
    start: string;
    end: string;
    modality?: string;
};

export type MaterializedSlot = {
    /** ISO-like instant string for stable sorting (same semantics as backend Carbon::toIso8601String in app TZ) */
    value: string;
    /** Display line (weekday, date, time range, modality) */
    label: string;
    /** YYYY-MM-DD no fuso da agenda (coluna do calendário) */
    dateKey: string;
    /** HH:mm — HH:mm */
    rangeShort: string;
    modality: string;
    ruleIndex: number;
    slotStartKey: string;
    weekKey: string;
    weekSort: number;
};

const MODALITIES = ['presential', 'online', 'both'] as const;

function normalizeRows(rows: ScheduleRowInput[] | null | undefined): ScheduleRowInput[] {
    if (!rows?.length) return [];
    const out: ScheduleRowInput[] = [];
    for (const row of rows) {
        const w = Number(row.weekday);
        const start = String(row.start ?? '').trim();
        const end = String(row.end ?? '').trim();
        if (w < 1 || w > 7 || !start || !end) continue;
        let m = String(row.modality ?? '').trim().toLowerCase();
        if (!MODALITIES.includes(m as (typeof MODALITIES)[number])) {
            m = 'both';
        }
        out.push({ weekday: w, start, end, modality: m });
    }
    return out;
}

function modalitySuffix(modality: string): string {
    if (modality === 'presential') return ' · Presencial';
    if (modality === 'online') return ' · Online';
    return ' · Presencial ou online';
}

function slotLabel(slotStart: dayjs.Dayjs, slotEnd: dayjs.Dayjs, modality: string, tz: string): string {
    const a = slotStart.tz(tz).locale('pt');
    const b = slotEnd.tz(tz).locale('pt');
    const startPart = `${a.format('ddd')}, ${a.format('D MMM')} · ${a.format('HH:mm')}`;
    const endPart = b.format('HH:mm');
    return `${startPart} — ${endPart}${modalitySuffix(modality)}`;
}

/**
 * Mirrors {@see App\Support\PastorWeeklySchedule::upcomingSlots} for the agenda UI.
 */
export function materializeWeeklySlots(
    rows: ScheduleRowInput[] | null | undefined,
    tz: string,
    fromIso: string,
    daysAhead = 56,
    maxSlots = 200,
): MaterializedSlot[] {
    const rules = normalizeRows(rows);
    if (rules.length === 0) return [];

    const start = dayjs(fromIso).tz(tz).startOf('minute');
    const endDay = start.clone().add(Math.max(1, daysAhead), 'day').endOf('day');

    const seen: Record<string, boolean> = {};
    const out: MaterializedSlot[] = [];

    let cursor = start.clone().tz(tz).startOf('day');
    outer: while (!cursor.isAfter(endDay, 'day')) {
        const dow = cursor.isoWeekday();
        for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
            const rule = rules[ruleIndex];
            if (rule.weekday !== dow) continue;

            const slotStart = dayjs.tz(`${cursor.format('YYYY-MM-DD')} ${rule.start}`, tz).startOf('minute');
            if (slotStart.isBefore(start)) continue;

            const value = slotStart.toISOString();
            if (seen[value]) continue;
            seen[value] = true;

            const slotEnd = dayjs.tz(`${cursor.format('YYYY-MM-DD')} ${rule.end}`, tz);
            const modality = String(rule.modality ?? 'both');
            const slotStartKey = slotStart.tz(tz).format('YYYY-MM-DD HH:mm');
            const wk = slotStart.tz(tz);
            const weekKey = `${wk.isoWeekYear()}-W${String(wk.isoWeek()).padStart(2, '0')}`;
            const weekSort = wk.isoWeekYear() * 100 + wk.isoWeek();
            const dateKey = slotStart.tz(tz).format('YYYY-MM-DD');
            const rangeShort = `${slotStart.tz(tz).format('HH:mm')} — ${slotEnd.tz(tz).format('HH:mm')}`;

            out.push({
                value,
                label: slotLabel(slotStart, slotEnd, modality, tz),
                dateKey,
                rangeShort,
                modality,
                ruleIndex,
                slotStartKey,
                weekKey,
                weekSort,
            });

            if (out.length >= maxSlots) break outer;
        }

        cursor = cursor.add(1, 'day');
    }

    return out.sort((a, b) => (a.value < b.value ? -1 : a.value > b.value ? 1 : 0));
}

export type WeekBucket = {
    weekKey: string;
    weekLabel: string;
    weekSort: number;
    slots: MaterializedSlot[];
};

export function groupSlotsByIsoWeek(slots: MaterializedSlot[], tz: string): WeekBucket[] {
    const map = new Map<string, { weekSort: number; slots: MaterializedSlot[] }>();
    for (const s of slots) {
        const cur = map.get(s.weekKey);
        if (cur) {
            cur.slots.push(s);
        } else {
            map.set(s.weekKey, { weekSort: s.weekSort, slots: [s] });
        }
    }

    const keys = [...map.keys()].sort((a, b) => (map.get(a)!.weekSort < map.get(b)!.weekSort ? -1 : 1));

    return keys.map((weekKey) => {
        const { weekSort, slots: weekSlots } = map.get(weekKey)!;
        const first = dayjs(weekSlots[0].value).tz(tz).locale('pt').startOf('isoWeek');
        const last = first.clone().endOf('isoWeek');
        const weekLabel = `Semana de ${first.format('D MMM')} — ${last.format('D MMM')}`;
        return { weekKey, weekLabel, weekSort, slots: weekSlots };
    });
}

function capitalizePt(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Segunda (início ISO) até domingo, no fuso indicado. */
export function weekCalendarRangeTitle(weekStartMonday: Dayjs, tz: string): string {
    const mon = weekStartMonday.tz(tz).locale('pt');
    const sun = mon.clone().add(6, 'day');
    if (mon.month() === sun.month() && mon.year() === sun.year()) {
        return `Semana: ${mon.format('D')} — ${sun.format('D')} de ${capitalizePt(mon.format('MMMM'))}`;
    }
    return `Semana: ${capitalizePt(mon.format('D MMM'))} — ${capitalizePt(sun.format('D MMM YYYY'))}`;
}

/** Linha tipo «Fuso horário: Lisboa (GMT+1)» para o cabeçalho da vista semanal. */
export function formatAgendaTimezoneLine(tz: string): string {
    const d = dayjs().tz(tz);
    const offsetMin = d.utcOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const hh = Math.floor(abs / 60);
    const mm = abs % 60;
    const gmt =
        mm === 0 ? `GMT${sign}${hh}` : `GMT${sign}${hh}:${String(mm).padStart(2, '0')}`;
    const tail = tz.includes('/') ? tz.split('/').pop()!.replace(/_/g, ' ') : tz.replace(/_/g, ' ');
    return `Fuso horário: ${tail} (${gmt})`;
}

/** Instância dayjs com utc / timezone / isoWeek (usar em componentes que manipulam datas da agenda). */
export { dayjs };
