<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('internship_placement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('rated_by')->constrained('users')->cascadeOnDelete();
            $table->enum('rater_role', ['student', 'coordinator']);

            // Rating criteria (1–5)
            $table->decimal('work_environment', 3, 1)->nullable();
            $table->decimal('mentorship_quality', 3, 1)->nullable();
            $table->decimal('learning_opportunities', 3, 1)->nullable();
            $table->decimal('facilities', 3, 1)->nullable();
            $table->decimal('overall_experience', 3, 1)->nullable();

            $table->decimal('average_rating', 4, 2)->nullable();
            $table->text('feedback')->nullable();
            $table->boolean('would_recommend')->default(true);
            $table->timestamps();

            $table->unique(['internship_placement_id', 'rated_by']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_ratings');
    }
};
