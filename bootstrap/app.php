<?php

use App\Support\ReportsDatabaseConnectionFailure;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;
use Inertia\Support\Header;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\PreventBrowserCacheHtmlResponses::class,
            \App\Http\Middleware\RecordPageViewsAfterResponse::class,
        ]);

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'can_access_admin_menu' => \App\Http\Middleware\EnsureCanAccessAdminMenu::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        /*
         * Com pedidos Inertia (XHR), redirect 302 após validação falhada pode fazer o cliente seguir o Location
         * sem uma segunda resposta Inertia JSON fiável — os erros ficam invisíveis no formulário.
         * 303 See Other após POST é o comportamento esperado para o próximo pedido GET e alinha com o fluxo Inertia.
         */
        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! $request->header(Header::INERTIA)) {
                return null;
            }

            $target = url()->previous();
            if ($target === '' || $target === $request->fullUrl()) {
                $referer = $request->headers->get('Referer');
                if (is_string($referer) && $referer !== '' && $referer !== $request->fullUrl()) {
                    $target = $referer;
                }
            }
            if ($target === '' || $target === $request->fullUrl()) {
                return null;
            }

            return redirect()->to($target)
                ->withErrors($e->errors(), $e->errorBag)
                ->withInput(Arr::except($request->input(), [
                    'password',
                    'password_confirmation',
                    'current_password',
                    'app_password',
                    'app_password_confirmation',
                ]))
                ->setStatusCode(303);
        });

        /*
         * Sessão/CSRF expirado (419): em produção não devemos mostrar a página crua "Page Expired".
         * Redireciona com mensagem amigável para o utilizador tentar novamente.
         */
        $exceptions->render(function (TokenMismatchException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'A sessão expirou. Atualize a página e tente novamente.',
                ], 419);
            }

            $message = 'A sessão expirou. Atualize a página e tente novamente.';

            $loginUrl = route('login');

            if ($request->header(Header::INERTIA)) {
                return redirect()->to($request->isMethod('GET') ? url()->current() : $loginUrl)
                    ->with('error', $message)
                    ->setStatusCode(303);
            }

            if ($request->routeIs('login') || $request->is('login')) {
                return redirect()->to($loginUrl)->with('error', $message);
            }

            return redirect()->guest($loginUrl)->with('error', $message);
        });

        /*
         * Falha de ligação à BD: sem isto, em produção (APP_DEBUG=false) o utilizador vê só «500» ou página genérica.
         * Resposta em HTML simples (sem Inertia / sem novas queries) para pedidos web e JSON para API.
         */
        $exceptions->render(function (\Throwable $e, Request $request) {
            if (! ReportsDatabaseConnectionFailure::matches($e)) {
                return null;
            }

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Não foi possível ligar à base de dados. Verifique o servidor e o arquivo .env.',
                ], 503);
            }

            return response()
                ->view('errors.database-unavailable', [], 503)
                ->header('Cache-Control', 'no-store, no-cache, must-revalidate');
        });
    })->create();
