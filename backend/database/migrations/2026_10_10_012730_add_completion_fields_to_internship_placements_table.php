<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('internship_placements', function (Blueprint $table) {
            $table->timestamp('completed_at')->nullable()->after('approved_at');
            $table->foreignId('completion_approved_by')->nullable()->constrained('users')->nullOnDelete()->after('completed_at');
            $table->text('completion_notes')->nullable()->after('completion_approved_by');
        });
    }

    public function down(): void
    {
        Schema::table('internship_placements', function (Blueprint $table) {
            $table->dropForeign(['completion_approved_by']);
            $table->dropColumn(['completed_at', 'completion_approved_by', 'completion_notes']);
        });
    }
};
