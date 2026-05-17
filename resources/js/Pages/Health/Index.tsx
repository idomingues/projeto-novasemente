import NewsIndex from '@/Pages/News/Index';

type WrappedProps = Omit<Parameters<typeof NewsIndex>[0], 'config'>;

export default function HealthIndex(props: WrappedProps) {
    return (
        <NewsIndex
            {...props}
            config={{
                entityTitle: 'Saúde',
                entityLabel: 'publicação de saúde',
                routeBase: 'health',
                mobileShowRoute: 'mobile.health.show',
            }}
        />
    );
}
