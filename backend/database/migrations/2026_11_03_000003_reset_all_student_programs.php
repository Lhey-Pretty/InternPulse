<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Reset program and course for ALL student profiles so every student
        // must explicitly select their own program via Edit Profile.
        DB::table('student_profiles')->update([
            'program' => null,
            'course'  => '',
        ]);
    }

    public function down(): void
    {
        // Not reversible
    }
};
