import MobileLayout from '@/Layouts/MobileLayout';
import ComingSoonPage from '@/Components/ComingSoonPage';

export default function MobileFotosComingSoon() {
    return (
        <MobileLayout>
            <ComingSoonPage
                title="Fotos"
                description="Estamos preparando o álbum de fotos para você. Em breve, tudo estará disponível por aqui."
                backHref={route('mobile.more')}
                backLabel="← Mais"
            />
        </MobileLayout>
    );
}
