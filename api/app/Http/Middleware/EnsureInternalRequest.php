<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Réserve une route au serveur de combat, qui présente le secret partagé dans X-Arene-Secret.
 */
class EnsureInternalRequest
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $secret = config('ranked.internal_secret');

        abort_unless(is_string($secret) && $secret !== '' && hash_equals($secret, (string) $request->header('X-Arene-Secret')), 403);

        return $next($request);
    }
}
