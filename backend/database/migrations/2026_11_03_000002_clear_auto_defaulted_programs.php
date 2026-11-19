<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Clear auto-defaulted 'BSIT' program from students who never actually
        // selected their program (no year_level = they never completed the form)
        DB::table('student_profiles')
            ->where('program', 'BSIT')
            ->whereNull('year_level')
            ->update(['program' => null, 'course' => null]);
    }

    public function down(): void
    {
        // Not reversible — user data
    }
};
