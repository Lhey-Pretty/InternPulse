<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('skills')
            ->whereIn(DB::raw('UPPER(category)'), ['BSENTREP', 'ENTREP'])
            ->update([
                'is_active' => false,
                'is_matchable' => false,
                'approved_at' => null,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Keep historical entrepreneurship skills inactive; ENTREP is not an OJT program.
    }
};
