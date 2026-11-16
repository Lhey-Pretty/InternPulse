<?php

test('API limits each IP address to 60 requests per minute', function () {
    for ($attempt = 1; $attempt <= 60; $attempt++) {
        $response = $this->postJson('/api/v1/auth/login', []);
        expect($response->status())->not->toBe(429);
    }

    $this->postJson('/api/v1/auth/login', [])->assertTooManyRequests();
});
