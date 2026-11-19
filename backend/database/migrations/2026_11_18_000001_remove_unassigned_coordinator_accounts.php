<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Coordinator accounts without a program assignment are generic accounts.
        // Keep only coordinators that are tied to a specific OJT program.
        DB::table('users')
            ->where('role', 'coordinator')
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('coordinator_profiles')
                    ->whereColumn('coordinator_profiles.user_id', 'users.id')
                    ->whereNotNull('coordinator_profiles.program')
                    ->where('coordinator_profiles.program', '!=', '');
            })
            ->delete();
    }

    public function down(): void
    {
        // Deleted generic coordinator accounts cannot be safely recreated.
    }
};
