import MobileNews from '@/Pages/Mobile/News';

type WrappedProps = Omit<Parameters<typeof MobileNews>[0], 'config'>;

export default function MobileHealth(props: WrappedProps) {
    return (
        <MobileNews
            {...props}
            config={{
                pageTitle: 'Saúde',
                showRoute: 'mobile.health.show',
                sectionTitle: 'Saúde',
            }}
        />
    );
}
