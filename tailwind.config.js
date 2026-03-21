import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'selector',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            keyframes: {
                'coming-soon-bob': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'coming-soon-desk': {
                    '0%, 100%': { transform: 'rotate(-2deg)' },
                    '50%': { transform: 'rotate(2deg)' },
                },
                'coming-soon-dots': {
                    '0%, 100%': { opacity: '0.35' },
                    '50%': { opacity: '1' },
                },
            },
            animation: {
                'coming-soon-bob': 'coming-soon-bob 2.2s ease-in-out infinite',
                'coming-soon-desk': 'coming-soon-desk 3s ease-in-out infinite',
                'coming-soon-dots': 'coming-soon-dots 1.2s ease-in-out infinite',
            },
        },
    },
    plugins: [
        forms,
    ],
};
