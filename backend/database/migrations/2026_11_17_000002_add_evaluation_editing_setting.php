<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('system_settings')->updateOrInsert(
            ['key' => 'evaluation_editing_enabled'],
            [
                'value' => '0',
                'label' => 'Evaluation Editing',
                'type' => 'boolean',
                'group' => 'evaluations',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
    }

    public function down(): void
    {
        DB::table('system_settings')->where('key', 'evaluation_editing_enabled')->delete();
    }
};
