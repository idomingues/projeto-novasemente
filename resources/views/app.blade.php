<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="font-sans antialiased">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=overlays-content">
        <script>
            (function() {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            })();
        </script>
        <title inertia>{{ $page['props']['appName'] ?? config('app.name', 'Laravel') }}</title>
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <link rel="icon" href="{{ asset('favicon.ico') }}" sizes="any">
        <link rel="icon" href="{{ asset('favicon-16x16.png') }}" type="image/png" sizes="16x16">
        <link rel="icon" href="{{ asset('favicon-32x32.png') }}" type="image/png" sizes="32x32">
        <link rel="icon" href="{{ asset('favicon-48x48.png') }}" type="image/png" sizes="48x48">
        <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}" sizes="180x180">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body>
        @inertia
    </body>
</html>
