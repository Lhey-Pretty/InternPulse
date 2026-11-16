<?php

test('API pagination defaults to 10 records per page', function () {
    $this->getJson('/api/v1/internships')
        ->assertOk()
        ->assertJsonPath('meta.per_page', 10);
});
