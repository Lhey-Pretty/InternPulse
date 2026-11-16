<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('placement_recommendations', function (Blueprint $table) {
            $table->date('requested_start_date')->nullable()->after('reason');
            $table->date('requested_end_date')->nullable()->after('requested_start_date');
            $table->unsignedInteger('requested_required_hours')->nullable()->after('requested_end_date');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE placement_recommendations MODIFY source ENUM('coordinator', 'company', 'ml') NOT NULL DEFAULT 'coordinator'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE placement_recommendations MODIFY source ENUM('coordinator', 'ml') NOT NULL DEFAULT 'coordinator'");
        }

        Schema::table('placement_recommendations', function (Blueprint $table) {
            $table->dropColumn([
                'requested_start_date',
                'requested_end_date',
                'requested_required_hours',
            ]);
        });
    }
};
