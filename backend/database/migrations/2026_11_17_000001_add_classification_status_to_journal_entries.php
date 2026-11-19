<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_entries', function (Blueprint $table): void {
            $table->string('classification_status')->default('pending')->after('classification_feedback')->index();
        });

        DB::table('journal_entries')
            ->whereNotNull('classification_result')
            ->update(['classification_status' => 'completed']);
    }

    public function down(): void
    {
        Schema::table('journal_entries', function (Blueprint $table): void {
            $table->dropIndex(['classification_status']);
            $table->dropColumn('classification_status');
        });
    }
};
