<?php

test('the root url redirects to the react app', function () {
    $response = $this->get('/');

    $response->assertRedirect(rtrim(config('app.frontend_url'), '/'));
});
