<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coordinator_profiles', function (Blueprint $table) {
            $table->string('program', 32)->nullable()->unique()->after('department');
        });
    }

    public function down(): void
    {
        Schema::table('coordinator_profiles', function (Blueprint $table) {
            $table->dropUnique(['program']);
            $table->dropColumn('program');
        });
    }
};
