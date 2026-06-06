import { useEffect } from 'react';
import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';
import { router } from '@inertiajs/react';

type InertiaPage = {
    props?: {
        auth?: { user?: { id?: number } | null };
    };
};

function pageUserId(page?: InertiaPage | null): number | null {
    const id = page?.props?.auth?.user?.id;
    return typeof id === 'number' ? id : null;
}

type Props = {
    initialUserId?: number | null;
};

export default function PushNotificationsSync({ initialUserId = null }: Props) {
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let cancelled = false;
        let removeListeners: Array<() => void> = [];
        let startedForUserId: number | null = null;

        const start = async (userId: number | null) => {
            if (!userId || startedForUserId === userId) return;
            startedForUserId = userId;

            try {
                const perm = await PushNotifications.requestPermissions();
                if (perm.receive !== 'granted') return;

                const info = await Device.getId().catch(() => null);
                const deviceId = info?.identifier ?? null;
                const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

                const regHandle = await PushNotifications.addListener('registration', async (token) => {
                    if (cancelled) return;
                    await axios.post('/mobile/push-tokens', {
                        platform,
                        token: token.value,
                        device_id: deviceId,
                    });
                });
                removeListeners.push(() => void regHandle.remove());

                const errHandle = await PushNotifications.addListener('registrationError', () => {
                    // no-op: the OS or Firebase/APNs can temporarily fail; retry happens on next app start
                });
                removeListeners.push(() => void errHandle.remove());

                // Optional listeners so taps/foreground pushes can be handled later.
                const recHandle = await PushNotifications.addListener('pushNotificationReceived', () => {});
                removeListeners.push(() => void recHandle.remove());

                const actHandle = await PushNotifications.addListener('pushNotificationActionPerformed', () => {});
                removeListeners.push(() => void actHandle.remove());

                await PushNotifications.register();
            } catch {
                // no-op
            }
        };

        void start(initialUserId);

        const removeRouterListener = router.on('success', (event) => {
            void start(pageUserId(event.detail.page as InertiaPage));
        });
        removeListeners.push(removeRouterListener);

        return () => {
            cancelled = true;
            removeListeners.forEach((fn) => fn());
            removeListeners = [];
        };
    }, []);

    return null;
}

