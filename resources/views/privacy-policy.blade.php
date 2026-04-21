<!DOCTYPE html>
<html lang="pt-BR" class="font-sans antialiased">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <title>Política de Privacidade — {{ config('app.name') }}</title>
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
                        <h1 class="text-2xl font-bold tracking-tight">Política de Privacidade</h1>
                    </div>
                </div>
                <p class="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
                    Última atualização: <span class="font-medium">{{ now()->format('d/m/Y') }}</span>
                </p>
            </header>

            <section class="prose prose-zinc max-w-none dark:prose-invert">
                <p>
                    Esta Política de Privacidade descreve como o aplicativo <strong>{{ config('app.name') }}</strong> (“App”) coleta,
                    usa e compartilha informações quando você utiliza o App e seus recursos.
                </p>

                <h2>1. Quem somos (Controlador)</h2>
                <p>
                    O controlador dos dados tratados por este App é a organização responsável pela operação do <strong>{{ config('app.name') }}</strong>.
                    Para contato sobre privacidade, utilize: <a href="mailto:{{ config('mail.from.address') }}">{{ config('mail.from.address') }}</a>.
                </p>

                <h2>2. Informações que coletamos</h2>
                <ul>
                    <li><strong>Informações de conta e perfil</strong>: quando você faz login e atualiza seu perfil (ex.: nome, e-mail e outros dados informados no App).</li>
                    <li><strong>Conteúdos e solicitações</strong>: informações que você envia em recursos do App (ex.: pedidos, mensagens de suporte, formulários e interações).</li>
                    <li><strong>Dados de uso e diagnósticos</strong>: registros técnicos necessários para funcionamento, segurança e melhoria (ex.: logs, erros, eventos e métricas).</li>
                    <li><strong>Notificações</strong>: caso você habilite notificações, podemos tratar tokens/identificadores necessários para entregar notificações no seu dispositivo.</li>
                </ul>

                <h2>3. Como usamos as informações</h2>
                <ul>
                    <li><strong>Fornecer e operar o App</strong>: autenticação, acesso a funcionalidades, atendimento e execução de solicitações.</li>
                    <li><strong>Suporte e comunicação</strong>: responder dúvidas e mensagens enviadas no App.</li>
                    <li><strong>Segurança</strong>: prevenção de abuso, fraudes e acessos não autorizados.</li>
                    <li><strong>Melhorias</strong>: entender performance e corrigir problemas.</li>
                </ul>

                <h2>4. Base legal (quando aplicável)</h2>
                <p>
                    Quando aplicável (ex.: LGPD), tratamos dados com base em: execução de contrato/serviço, legítimo interesse
                    (ex.: segurança e melhorias), cumprimento de obrigação legal e consentimento (ex.: quando requerido para uma funcionalidade específica).
                </p>

                <h2>5. Compartilhamento de dados</h2>
                <p>Podemos compartilhar informações nas seguintes hipóteses:</p>
                <ul>
                    <li><strong>Prestadores de serviço</strong>: provedores de hospedagem, banco de dados, e-mail e infraestrutura, quando necessário para operar o App.</li>
                    <li><strong>Exigência legal</strong>: para cumprir lei, ordem judicial ou solicitações legítimas de autoridades.</li>
                    <li><strong>Proteção de direitos</strong>: para investigar e prevenir violações de segurança ou termos.</li>
                </ul>

                <h2>6. Retenção</h2>
                <p>
                    Mantemos as informações pelo tempo necessário para cumprir as finalidades descritas nesta política,
                    respeitando prazos legais e necessidades operacionais (ex.: auditoria e segurança).
                </p>

                <h2>7. Seus direitos</h2>
                <p>
                    Dependendo da sua jurisdição, você pode ter direitos como: confirmar tratamento, acessar, corrigir, solicitar exclusão,
                    portabilidade, revogar consentimento e se opor a determinados tratamentos. Para solicitar, entre em contato pelo e-mail acima.
                </p>

                <h2>8. Segurança</h2>
                <p>
                    Adotamos medidas técnicas e organizacionais razoáveis para proteger as informações. Ainda assim, nenhum sistema é 100% seguro.
                </p>

                <h2>9. Crianças e adolescentes</h2>
                <p>
                    O App não é direcionado a crianças. Se você acredita que coletamos dados de menor de forma indevida, entre em contato.
                </p>

                <h2>10. Transferências internacionais</h2>
                <p>
                    Dependendo da infraestrutura utilizada, seus dados podem ser processados em servidores localizados fora do seu país.
                    Nesses casos, aplicamos salvaguardas apropriadas quando exigido.
                </p>

                <h2>11. Alterações nesta política</h2>
                <p>
                    Podemos atualizar esta política periodicamente. A versão vigente estará sempre disponível nesta página, com a data de atualização.
                </p>
            </section>

            <footer class="mt-10 border-t border-zinc-200 pt-6 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                <p>
                    Link permanente:
                    <a class="font-medium underline" href="{{ url('/politica-de-privacidade') }}">{{ url('/politica-de-privacidade') }}</a>
                </p>
            </footer>
        </main>
    </body>
</html>
