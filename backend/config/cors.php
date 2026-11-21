<?php

// Browser origins contain the scheme, host and port, without the SPA's path.
$frontendUrl = parse_url((string) config('app.frontend_url', 'http://localhost:5173/InternPulse'));
$frontendOrigin = isset($frontendUrl['scheme'], $frontendUrl['host'])
    ? $frontendUrl['scheme'].'://'.$frontendUrl['host'].(isset($frontendUrl['port']) ? ':'.$frontendUrl['port'] : '')
    : null;

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter([
        $frontendOrigin,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ])),

    // Vite selects another port when its default port is already in use.
    'allowed_origins_patterns' => in_array(config('app.env'), ['local', 'testing'], true)
        ? ['~^https?://(?:localhost|127\.0\.0\.1)(?::[0-9]+)?$~']
        : [],

    'allowed_headers' => ['*'],

    // Lets the SPA read the server-provided filename on file downloads.
    'exposed_headers' => ['Content-Disposition'],

    'max_age' => 0,

    'supports_credentials' => false,

];
