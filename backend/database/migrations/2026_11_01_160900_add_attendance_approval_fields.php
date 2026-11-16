<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $approvedAt = now();

        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->foreignId('time_in_approved_by')->nullable()->after('remarks')->constrained('users')->nullOnDelete();
            $table->timestamp('time_in_approved_at')->nullable()->after('time_in_approved_by');
            $table->foreignId('time_out_approved_by')->nullable()->after('time_in_approved_at')->constrained('users')->nullOnDelete();
            $table->timestamp('time_out_approved_at')->nullable()->after('time_out_approved_by');
        });

        DB::table('attendance_logs')
            ->whereNotNull('time_in')
            ->update([
                'time_in_approved_at' => $approvedAt,
                'time_out_approved_at' => DB::raw("CASE WHEN time_out IS NOT NULL THEN '{$approvedAt->toDateTimeString()}' ELSE NULL END"),
            ]);
    }

    public function down(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->dropForeign(['time_in_approved_by']);
            $table->dropForeign(['time_out_approved_by']);
            $table->dropColumn([
                'time_in_approved_by',
                'time_in_approved_at',
                'time_out_approved_by',
                'time_out_approved_at',
            ]);
        });
    }
};
