<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('placement_recommendations', function (Blueprint $table) {
            $table->foreignId('application_id')->nullable()->after('internship_posting_id')
                ->constrained()->nullOnDelete();
            $table->index(['application_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('placement_recommendations', function (Blueprint $table) {
            $table->dropForeign(['application_id']);
            $table->dropIndex(['application_id', 'status']);
            $table->dropColumn('application_id');
        });
    }
};
