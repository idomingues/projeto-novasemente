<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
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
        ]);

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
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
                ->withInput(Arr::except($request->input(), ['password', 'password_confirmation']))
                ->setStatusCode(303);
        });
    })->create();
