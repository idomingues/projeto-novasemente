import { useEffect } from 'react';
import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';

type InertiaPage = {
    props?: {
        auth?: { user?: { id?: number } | null };
    };
};

function currentUserId(): number | null {
    const page = (window as unknown as { __inertia?: { page?: InertiaPage } }).__inertia?.page;
    const id = page?.props?.auth?.user?.id;
    return typeof id === 'number' ? id : null;
}

export default function PushNotificationsSync() {
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        if (!currentUserId()) return;

        let cancelled = false;
        let removeListeners: Array<() => void> = [];

        const start = async () => {
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

        void start();

        return () => {
            cancelled = true;
            removeListeners.forEach((fn) => fn());
            removeListeners = [];
        };
    }, []);

    return null;
}

