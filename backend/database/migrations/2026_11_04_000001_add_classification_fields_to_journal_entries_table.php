<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->string('classification_result')->nullable()->after('is_verified');
            $table->boolean('is_related')->default(true)->after('classification_result');
            $table->decimal('confidence_score', 5, 2)->nullable()->after('is_related');
            $table->json('detected_tasks')->nullable()->after('confidence_score');
            $table->string('flag_level')->default('Normal')->after('detected_tasks');
            $table->text('classification_feedback')->nullable()->after('flag_level');
        });
    }

    public function down(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropColumn([
                'classification_result',
                'is_related',
                'confidence_score',
                'detected_tasks',
                'flag_level',
                'classification_feedback',
            ]);
        });
    }
};
