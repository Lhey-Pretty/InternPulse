<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Update any student profiles still using the old 600-hour default to 480
        DB::table('student_profiles')
            ->where('required_hours', 600)
            ->update(['required_hours' => 480]);

        // Also ensure the system setting is correct
        DB::table('system_settings')
            ->where('key', 'default_required_hours')
            ->update(['value' => '480']);
    }

    public function down(): void
    {
        DB::table('student_profiles')
            ->where('required_hours', 480)
            ->update(['required_hours' => 600]);
    }
};
