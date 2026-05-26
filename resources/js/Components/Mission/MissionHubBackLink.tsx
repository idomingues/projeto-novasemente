import { Link } from '@inertiajs/react';

export default function MissionHubBackLink() {
    return (
        <Link
            href={route('mobile.mission')}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
            ← Missão
        </Link>
    );
}
