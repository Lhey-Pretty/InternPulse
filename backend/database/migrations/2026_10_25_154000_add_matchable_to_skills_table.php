<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('skills', function (Blueprint $table) {
            $table->boolean('is_matchable')->default(true)->after('is_active');
            $table->index(['is_active', 'is_matchable']);
        });
    }

    public function down(): void
    {
        Schema::table('skills', function (Blueprint $table) {
            $table->dropIndex(['skills_is_active_is_matchable_index']);
            $table->dropColumn('is_matchable');
        });
    }
};
