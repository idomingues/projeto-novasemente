import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'ns:admin-sidebar-collapsed';

export function useAdminSidebarCollapsed() {
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        try {
            setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
        } catch {
            // ignore
        }
    }, []);

    const collapse = useCallback(() => {
        setCollapsed(true);
        try {
            localStorage.setItem(STORAGE_KEY, '1');
        } catch {
            // ignore
        }
    }, []);

    const expand = useCallback(() => {
        setCollapsed(false);
        try {
            localStorage.setItem(STORAGE_KEY, '0');
        } catch {
            // ignore
        }
    }, []);

    return { collapsed, collapse, expand };
}
