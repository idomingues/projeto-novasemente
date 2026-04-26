<!DOCTYPE html>
<html lang="pt-BR" class="font-sans antialiased">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <title>Exclusão de conta e dados — {{ config('app.name') }}</title>
        <meta name="robots" content="index,follow">
        <link rel="icon" href="{{ asset('favicon.ico') }}" sizes="any">
        <link rel="icon" href="{{ asset('favicon-16x16.png') }}" type="image/png" sizes="16x16">
        <link rel="icon" href="{{ asset('favicon-32x32.png') }}" type="image/png" sizes="32x32">
        <link rel="icon" href="{{ asset('favicon-48x48.png') }}" type="image/png" sizes="48x48">
        <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}" sizes="180x180">

        @vite(['resources/css/app.css'])
    </head>
    <body class="bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <main class="mx-auto max-w-3xl px-5 py-10">
            <header class="mb-8">
                <div class="flex items-center gap-3">
                    <img src="{{ asset('logo-ns.png') }}" alt="{{ config('app.name') }}" class="h-10 w-10 rounded-full object-cover dark:invert">
                    <div>
                        <div class="text-sm font-semibold tracking-wide text-zinc-700 dark:text-zinc-300">{{ config('app.name') }}</div>
                        <h1 class="text-2xl font-bold tracking-tight">Exclusão de conta e dados</h1>
                    </div>
                </div>
                <p class="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
                    Última atualização: <span class="font-medium">{{ now()->format('d/m/Y') }}</span>
                </p>
            </header>

            <section class="prose prose-zinc max-w-none dark:prose-invert">
                <p>
                    Se você deseja solicitar a <strong>exclusão da sua conta</strong> e dos <strong>dados associados</strong> no app
                    <strong>{{ config('app.name') }}</strong>, siga uma das opções abaixo.
                </p>

                <h2>Como solicitar</h2>
                <ol>
                    <li>
                        <strong>Pelo suporte no app</strong>: abra o app e acesse <em>Mais</em> → <em>Suporte</em>, e abra um chamado com o assunto
                        <strong>“Exclusão de conta e dados”</strong>.
                    </li>
                    <li>
                        <strong>Por e-mail</strong>: envie a solicitação para
                        <a href="mailto:{{ config('mail.from.address') }}?subject={{ rawurlencode('Exclusão de conta e dados') }}">{{ config('mail.from.address') }}</a>
                        usando o mesmo e-mail cadastrado no app.
                    </li>
                </ol>

                <h2>O que vamos pedir para confirmar</h2>
                <ul>
                    <li><strong>E-mail da conta</strong> (obrigatório).</li>
                    <li><strong>Nome completo</strong> (se disponível na conta).</li>
                    <li>Se necessário, <strong>confirmação adicional</strong> para evitar exclusão indevida.</li>
                </ul>

                <h2>O que é excluído</h2>
                <ul>
                    <li>Dados de autenticação e perfil vinculados à conta.</li>
                    <li>Conteúdos enviados pela conta (ex.: mensagens/solicitações), quando aplicável e permitido.</li>
                    <li>Tokens de notificação associados ao dispositivo/conta.</li>
                </ul>

                <h2>O que pode ser retido</h2>
                <p>
                    Alguns dados podem ser retidos por prazos mínimos por <strong>obrigação legal</strong>, <strong>segurança</strong> e/ou
                    <strong>auditoria</strong> (ex.: registros de acesso e logs), conforme a legislação aplicável.
                </p>

                <h2>Prazo</h2>
                <p>
                    Em geral, processamos solicitações em até <strong>30 dias</strong>.
                </p>
            </section>

            <footer class="mt-10 border-t border-zinc-200 pt-6 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                <p>
                    Link permanente:
                    <a class="font-medium underline" href="{{ url('/exclusao-de-conta') }}">{{ url('/exclusao-de-conta') }}</a>
                </p>
                <p class="mt-2">
                    Política de privacidade:
                    <a class="font-medium underline" href="{{ url('/politica-de-privacidade') }}">{{ url('/politica-de-privacidade') }}</a>
                </p>
            </footer>
        </main>
    </body>
</html>

