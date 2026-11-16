<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('internship_placements', function (Blueprint $table) {
            // Add 'transferred' to status enum
            $table->enum('status', ['active', 'completed', 'terminated', 'on_hold', 'transferred'])->default('active')->change();
            
            // Add transfer-related columns
            $table->text('transfer_reason')->nullable()->after('termination_reason');
            $table->timestamp('transferred_at')->nullable()->after('transfer_reason');
            $table->foreignId('transferred_by')->nullable()->constrained('users')->nullOnDelete()->after('transferred_at');
            $table->foreignId('coordinator_id')->nullable()->constrained('users')->nullOnDelete()->after('approved_by');
        });
    }

    public function down(): void
    {
        Schema::table('internship_placements', function (Blueprint $table) {
            $table->dropColumn(['transfer_reason', 'transferred_at', 'transferred_by', 'coordinator_id']);
            $table->enum('status', ['active', 'completed', 'terminated', 'on_hold'])->default('active')->change();
        });
    }
};
