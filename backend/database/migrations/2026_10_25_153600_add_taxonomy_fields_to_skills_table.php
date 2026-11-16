<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('skills', function (Blueprint $table) {
            $table->string('canonical_name')->nullable()->after('name');
            $table->json('aliases')->nullable()->after('category');
            $table->string('source')->nullable()->after('aliases');
            $table->boolean('is_active')->default(true)->after('source');
            $table->timestamp('approved_at')->nullable()->after('is_active');
            $table->index(['is_active', 'category']);
        });
    }

    public function down(): void
    {
        Schema::table('skills', function (Blueprint $table) {
            $table->dropIndex(['skills_is_active_category_index']);
            $table->dropColumn([
                'canonical_name',
                'aliases',
                'source',
                'is_active',
                'approved_at',
            ]);
        });
    }
};
