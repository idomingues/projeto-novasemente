import MobileNewsShow from '@/Pages/Mobile/NewsShow';

type WrappedProps = Omit<Parameters<typeof MobileNewsShow>[0], 'config'>;

export default function MobileHealthShow(props: WrappedProps) {
    return (
        <MobileNewsShow
            {...props}
            config={{
                listRoute: 'mobile.health',
                listLabel: 'publicações de saúde',
                showRoute: 'mobile.health.show',
            }}
        />
    );
}
