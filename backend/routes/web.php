<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| The user interface is the React SPA in `frontend/`. This Laravel app is
| API-only: everything the SPA calls lives under /api/v1 (see routes/api_v1.php).
| The Blade pages that used to duplicate the SPA have been removed, so the only
| remaining web routes are the redirects below, which send browsers that land
| on the old Laravel URLs to the SPA instead of returning a 404.
|
*/

$frontend = fn (string $path = '') => redirect()->away(
    rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/') . $path
);

Route::get('/', fn () => $frontend())->name('home');
Route::get('/login', fn () => $frontend('/login'))->name('login');
