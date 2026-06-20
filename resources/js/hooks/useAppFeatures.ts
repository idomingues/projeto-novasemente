import { usePage } from '@inertiajs/react';

type AuthWithAdmin = {
    canAccessAdminMenu?: boolean;
};

/**
 * Funcionalidades do app desativadas para membros (por igreja).
 * Admins com menu do painel veem tudo na UI e podem aceder às rotas.
 */
export function useAppFeatures() {
    const page = usePage();
    const disabled =
        (page.props as { disabledAppFeatures?: string[] }).disabledAppFeatures ?? [];
    const canAccessAdminMenu =
        (page.props.auth as AuthWithAdmin | undefined)?.canAccessAdminMenu === true;

    const isEnabled = (key: string): boolean => {
        if (canAccessAdminMenu) {
            return true;
        }

        return !disabled.includes(key);
    };

    return { isEnabled, disabledKeys: disabled };
}

export function isAppFeatureEnabledFromProps(
    props: { disabledAppFeatures?: string[]; auth?: AuthWithAdmin },
    key: string,
): boolean {
    if (props.auth?.canAccessAdminMenu) {
        return true;
    }

    const disabled = props.disabledAppFeatures ?? [];

    return !disabled.includes(key);
}
