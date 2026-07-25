<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="font-sans antialiased">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=overlays-content">
        <script>
            (function() {
                var UI_VERSION = '380';
                var theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                document.body.style.overflow = '';
                var splash = document.getElementById('ns-splash');
                if (splash && splash.parentNode) {
                    splash.parentNode.removeChild(splash);
                }
                var prevUi = localStorage.getItem('ns-app-ui-version');
                if (prevUi !== null && prevUi !== UI_VERSION) {
                    localStorage.setItem('ns-app-ui-version', UI_VERSION);
                    location.reload();
                    return;
                }
                if (prevUi === null) {
                    localStorage.setItem('ns-app-ui-version', UI_VERSION);
                }
            })();
        </script>
        <title inertia>{{ $page['props']['appName'] ?? config('app.name') ?? 'Nova Semente' }}</title>
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <link rel="icon" href="{{ asset('favicon.ico') }}" sizes="any">
        <link rel="icon" href="{{ asset('favicon-16x16.png') }}" type="image/png" sizes="16x16">
        <link rel="icon" href="{{ asset('favicon-32x32.png') }}" type="image/png" sizes="32x32">
        <link rel="icon" href="{{ asset('favicon-48x48.png') }}" type="image/png" sizes="48x48">
        <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}" sizes="180x180">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600,700|great-vibes:400&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        {{-- Só as entradas definidas em vite.config.js; o chunk da página vem do import.meta.glob em app.tsx --}}
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        @inertiaHead
    </head>
    <body>
        <style>
            /* Minimal splash styles (no dependency on bundled CSS) */
            #ns-splash {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f4f4f5; /* zinc-100 */
                transition: opacity 260ms ease;
                /* Se o JS não carregar, some sozinho após 3s (evita tela cinza presa). */
                animation: ns-splash-auto-hide 0.35s ease 3s forwards;
            }
            @keyframes ns-splash-auto-hide {
                to {
                    opacity: 0;
                    pointer-events: none;
                    visibility: hidden;
                }
            }
            html.dark #ns-splash {
                background: #09090b; /* zinc-950 */
            }
            #ns-splash-inner {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 14px;
            }
            #ns-splash-logo {
                width: 92px;
                height: 92px;
                border-radius: 9999px;
                object-fit: cover;
                box-shadow: 0 16px 40px rgba(0,0,0,.12);
            }
            html.dark #ns-splash-logo {
                filter: invert(1);
                box-shadow: 0 16px 40px rgba(255,255,255,.08);
            }
            #ns-splash-title {
                font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
                font-size: 14px;
                font-weight: 600;
                letter-spacing: .06em;
                text-transform: uppercase;
                color: rgba(24, 24, 27, .75); /* zinc-900 */
            }
            html.dark #ns-splash-title {
                color: rgba(244, 244, 245, .78); /* zinc-100 */
            }
            #ns-splash-fadeout {
                opacity: 0;
                pointer-events: none;
            }
        </style>

        <div id="ns-splash" aria-hidden="true">
            <div id="ns-splash-inner">
                <img id="ns-splash-logo" src="{{ asset('logo-ns.png') }}" alt="Nova Semente" />
                <div id="ns-splash-title">Nova Semente</div>
            </div>
        </div>

        @inertia
        <script>
            (function () {
                function removeSplash() {
                    var splash = document.getElementById('ns-splash') || document.getElementById('ns-splash-fadeout');
                    if (splash && splash.parentNode) {
                        splash.parentNode.removeChild(splash);
                    }
                }

                function clearStuckOverlays() {
                    document.body.style.overflow = '';
                    document.body.style.pointerEvents = '';
                    removeSplash();
                    var app = document.getElementById('app');
                    var nodes = document.body.children;
                    for (var i = 0; i < nodes.length; i++) {
                        var el = nodes[i];
                        if (!el || el === app) {
                            continue;
                        }
                        if (el.nodeType !== 1) {
                            continue;
                        }
                        var s = window.getComputedStyle(el);
                        if (s.position !== 'fixed') {
                            continue;
                        }
                        var z = parseInt(s.zIndex, 10);
                        if (!isFinite(z) || z < 40) {
                            continue;
                        }
                        var cn = el.className || '';
                        if (
                            el.getAttribute('role') === 'dialog' ||
                            (el.id && el.id.indexOf('headlessui') === 0) ||
                            cn.indexOf('bg-black') !== -1 ||
                            cn.indexOf('bg-zinc-950') !== -1 ||
                            cn.indexOf('backdrop-blur') !== -1
                        ) {
                            el.parentNode && el.parentNode.removeChild(el);
                        }
                    }
                }

                function boot() {
                    clearStuckOverlays();
                    removeSplash();
                }

                boot();
                document.addEventListener('DOMContentLoaded', boot);
                window.setTimeout(removeSplash, 1200);
                window.setTimeout(removeSplash, 3500);

                var ticks = 0;
                var guard = window.setInterval(function () {
                    clearStuckOverlays();
                    ticks += 1;
                    if (ticks >= 30) {
                        window.clearInterval(guard);
                    }
                }, 500);
            })();
        </script>
    </body>
</html>
