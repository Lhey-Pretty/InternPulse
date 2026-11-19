<?php

use App\Support\AcademicPrograms;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (array_keys(AcademicPrograms::PROGRAMS) as $program) {
            foreach (['dean_name' => 'Dean / Director Name', 'dean_title' => 'Dean / Director Title'] as $field => $label) {
                DB::table('system_settings')->updateOrInsert(['key' => "signatory_{$program}_{$field}"], [
                    'value' => '', 'label' => "{$program} {$label}", 'type' => 'text', 'group' => 'report_signatories',
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('system_settings')->where('group', 'report_signatories')->delete();
    }
};
