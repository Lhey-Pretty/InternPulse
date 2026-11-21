<?php

use Illuminate\Support\Facades\Cache;

test('local Vite ports can preflight the sign-in options request', function (string $origin) {
    config(['app.env' => 'local']);
    config(['cors' => require config_path('cors.php')]);

    $this->options('http://localhost/api/v1/auth/options', [], [
        'Origin' => $origin,
        'Access-Control-Request-Method' => 'GET',
        'Access-Control-Request-Headers' => 'authorization,content-type',
    ])->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', $origin)
        ->assertHeader('Access-Control-Allow-Methods', 'GET')
        ->assertHeader('Access-Control-Allow-Headers', 'authorization,content-type');
})->with([
    'occupied default port' => 'http://localhost:5174',
    'another occupied port' => 'http://localhost:5175',
    'loopback IP' => 'http://127.0.0.1:5180',
]);

test('the configured frontend origin can read sign-in options in production', function (string $frontendUrl, string $origin) {
    config([
        'app.env' => 'production',
        'app.frontend_url' => $frontendUrl,
    ]);
    config(['cors' => require config_path('cors.php')]);

    Cache::forever('setting.password_auth_enabled', '1');
    Cache::forever('setting.google_auth_enabled', '0');

    $this->getJson('http://localhost/api/v1/auth/options', ['Origin' => $origin])
        ->assertOk()
        ->assertJsonPath('data.password_enabled', true)
        ->assertJsonPath('data.google_enabled', false)
        ->assertHeader('Access-Control-Allow-Origin', $origin);
})->with([
    'SPA subdirectory' => ['https://internpulse.example/InternPulse', 'https://internpulse.example'],
    'explicit port' => ['https://internpulse.example:8443/InternPulse/', 'https://internpulse.example:8443'],
]);

test('CORS rejects unconfigured origins and limits flexible local ports to development', function (string $environment, string $origin) {
    config([
        'app.env' => $environment,
        'app.frontend_url' => 'https://internpulse.example/InternPulse',
    ]);
    config(['cors' => require config_path('cors.php')]);

    $this->options('http://localhost/api/v1/auth/options', [], [
        'Origin' => $origin,
        'Access-Control-Request-Method' => 'GET',
    ])->assertNoContent()
        ->assertHeaderMissing('Access-Control-Allow-Origin');
})->with([
    'unconfigured website' => ['production', 'https://other.example'],
    'lookalike local hostname' => ['local', 'http://localhost.other.example:5174'],
    'dynamic local port in production' => ['production', 'http://localhost:5174'],
]);
