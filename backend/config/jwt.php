<?php

return [
    'secret' => env('JWT_SECRET') ?: env('APP_KEY'),
    'issuer' => env('APP_URL', 'http://localhost'),
    'ttl_seconds' => 3600,
    'refresh_grace_seconds' => 604800,
];
