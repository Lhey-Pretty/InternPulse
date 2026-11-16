<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('journal_entries', function (Blueprint $table): void {
                $table->dropUnique('journal_entries_internship_placement_id_entry_date_unique');
            });

            return;
        }

        // Check what foreign keys reference this unique index
        $foreignKeys = DB::select("
            SELECT CONSTRAINT_NAME 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'journal_entries' 
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        ");
        
        // Drop foreign keys temporarily
        $droppedKeys = [];
        foreach ($foreignKeys as $fk) {
            try {
                DB::statement("ALTER TABLE journal_entries DROP FOREIGN KEY {$fk->CONSTRAINT_NAME}");
                $droppedKeys[] = $fk->CONSTRAINT_NAME;
            } catch (\Exception $e) {
                // Continue if already dropped
            }
        }
        
        // Now drop the unique index
        try {
            DB::statement('ALTER TABLE journal_entries DROP INDEX journal_entries_internship_placement_id_entry_date_unique');
        } catch (\Exception $e) {
            // May already be dropped
        }
        
        // Restore foreign keys
        foreach ($droppedKeys as $constraintName) {
            if (str_contains($constraintName, 'internship_placement_id')) {
                DB::statement('ALTER TABLE journal_entries ADD CONSTRAINT ' . $constraintName . ' FOREIGN KEY (internship_placement_id) REFERENCES internship_placements(id) ON DELETE CASCADE');
            } elseif (str_contains($constraintName, 'student_profile_id')) {
                DB::statement('ALTER TABLE journal_entries ADD CONSTRAINT ' . $constraintName . ' FOREIGN KEY (student_profile_id) REFERENCES student_profiles(id) ON DELETE CASCADE');
            }
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('journal_entries', function (Blueprint $table): void {
                $table->unique(
                    ['internship_placement_id', 'entry_date'],
                    'journal_entries_internship_placement_id_entry_date_unique',
                );
            });

            return;
        }

        // Restore the unique constraint
        DB::statement('ALTER TABLE journal_entries ADD UNIQUE INDEX journal_entries_internship_placement_id_entry_date_unique (internship_placement_id, entry_date)');
    }
};
