<?php

namespace App\Support;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Inertia\Support\Header;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class InertiaAccessDeniedResponse
{
    public const FLASH_MESSAGE = 'Você não tem mais acesso a este conteúdo. Se o aviso for antigo, ele pode não estar mais disponível para a sua conta.';

    public static function matches(Throwable $e): bool
    {
        if ($e instanceof AuthorizationException) {
            return true;
        }

        return $e instanceof HttpExceptionInterface && $e->getStatusCode() === Response::HTTP_FORBIDDEN;
    }

    public static function render(Throwable $e, Request $request): ?\Illuminate\Http\RedirectResponse
    {
        if (! self::matches($e)) {
            return null;
        }

        if ($request->expectsJson() && ! $request->header(Header::INERTIA)) {
            return null;
        }

        if ($request->header(Header::INERTIA)) {
            return redirect()
                ->to(self::redirectTarget($request))
                ->with('info', self::FLASH_MESSAGE)
                ->setStatusCode(303);
        }

        return null;
    }

    private static function redirectTarget(Request $request): string
    {
        $target = url()->previous();
        if ($target !== '' && $target !== $request->fullUrl()) {
            return $target;
        }

        $referer = $request->headers->get('Referer');
        if (is_string($referer) && $referer !== '' && $referer !== $request->fullUrl()) {
            return $referer;
        }

        if ($request->user()) {
            return route('mobile.notifications');
        }

        return route('login');
    }
}
