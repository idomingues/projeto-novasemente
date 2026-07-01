import MobileLayout from '@/Layouts/MobileLayout';
import RevistaAdventistaAcervoContent from '@/Components/Mobile/RevistaAdventistaAcervoContent';
import { Head, router } from '@inertiajs/react';

interface Edition {
    id: number;
    title: string;
    year: number;
    month: number;
    month_label: string;
    cover_url: string | null;
    has_pdf: boolean;
}

interface DecadeGroup {
    label: string;
    years: number[];
}

interface Props {
    editions: Edition[];
    availableYears: number[];
    selectedYear: number;
    decades: DecadeGroup[];
}

export default function MobileRevistaAdventistaAcervo({ editions, availableYears, selectedYear, decades }: Props) {
    const selectYear = (year: number) => {
        router.get(route('mobile.acervo-revista-adventista'), { ano: year }, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <MobileLayout>
            <Head title="Acervo Revista Adventista" />
            <div className="mx-auto w-full max-w-lg sm:max-w-none">
                <RevistaAdventistaAcervoContent
                    editions={editions}
                    availableYears={availableYears}
                    selectedYear={selectedYear}
                    decades={decades}
                    onSelectYear={selectYear}
                />
            </div>
        </MobileLayout>
    );
}
