<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_temporary')->default(false)->after('is_active');
            $table->timestamp('access_starts_at')->nullable()->after('is_temporary');
            $table->timestamp('access_ends_at')->nullable()->after('access_starts_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_temporary', 'access_starts_at', 'access_ends_at']);
        });
    }
};
