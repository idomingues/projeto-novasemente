import { LIST_SEARCH_MIN_LENGTH } from '@/utils/listSearch';

type Props = {
    show: boolean;
    minLength?: number;
    className?: string;
};

export default function ListSearchHint({ show, minLength = LIST_SEARCH_MIN_LENGTH, className = '' }: Props) {
    if (!show) {
        return null;
    }

    return (
        <p className={`text-xs text-zinc-500 dark:text-zinc-400 ${className}`.trim()}>
            Digite pelo menos {minLength} caracteres para buscar.
        </p>
    );
}
