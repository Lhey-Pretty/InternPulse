<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('student_profiles')->where('section', '4-F2')->update(['section' => '4F2']);
        DB::table('student_profiles')->where('section', '4-F3')->update(['section' => '4F3']);

        DB::table('student_profiles')
            ->whereNotNull('section')
            ->whereNotIn('section', ['4F1', '4F2', '4F3'])
            ->update(['section' => null]);
    }

    public function down(): void
    {
        // Keep student section values within the approved list after rollback.
    }
};
