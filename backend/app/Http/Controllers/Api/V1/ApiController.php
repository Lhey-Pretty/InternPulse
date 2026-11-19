<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponses;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

/**
 * Base class for the Version 1 API controllers. Shared helpers live here.
 */
class ApiController extends Controller
{
    // Gives every controller that extends this class the ok(), success() and error() helpers
    use ApiResponses, AuthorizesRequests;

    /**
     * Returns true when the client asked for a relationship with ?include=...
     * Example: /api/v1/internships?include=author -> include('author') is true.
     */
    public function include(string $relationship): bool
    {
        // Read the "include" query parameter (null when it is not in the URL)
        $param = request()->get('include');

        if (! isset($param)) {
            return false;
        }

        // ?include=author,internships -> ['author', 'internships']
        $includeValues = explode(',', strtolower($param));

        return in_array(strtolower($relationship), $includeValues, true);
    }

    /** Return a bounded page size shared by API collection endpoints. */
    protected function perPage(Request $request, int $default = 10): int
    {
        $requested = filter_var($request->query('per_page', $default), FILTER_VALIDATE_INT);

        return min(100, max(1, $requested === false ? $default : $requested));
    }

    /**
     * Asks the policy whether the logged-in user may do $ability on $target.
     * Returns true or false instead of throwing an exception.
     *
     * Example: isAble('update', $target) calls Policy::update()
     */
    public function isAble(string $ability, mixed $target): bool
    {
        try {
            // JWT middleware resolves the bearer token's user for this request.
            $user = request()->user() ?? auth()->user();
            if ($user && ! auth()->check()) {
                auth()->setUser($user);
            }

            // authorize() throws AuthorizationException when the policy says no
            $this->authorize($ability, $target);

            return true;
        } catch (AuthorizationException $e) {
            return false;
        }
    }
}
