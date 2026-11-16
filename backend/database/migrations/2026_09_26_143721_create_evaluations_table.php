<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('internship_placement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('evaluated_by')->constrained('users')->cascadeOnDelete(); // company user
            $table->enum('evaluation_period', ['midterm', 'final'])->default('final');

            // Performance criteria (1-5 scale)
            $table->decimal('work_quality', 3, 1)->nullable();
            $table->decimal('work_quantity', 3, 1)->nullable();
            $table->decimal('punctuality', 3, 1)->nullable();
            $table->decimal('attendance_score', 3, 1)->nullable();
            $table->decimal('initiative', 3, 1)->nullable();
            $table->decimal('teamwork', 3, 1)->nullable();
            $table->decimal('communication', 3, 1)->nullable();
            $table->decimal('problem_solving', 3, 1)->nullable();
            $table->decimal('technical_skills', 3, 1)->nullable();
            $table->decimal('professionalism', 3, 1)->nullable();

            $table->decimal('overall_rating', 4, 2)->nullable();
            $table->text('strengths')->nullable();
            $table->text('areas_for_improvement')->nullable();
            $table->text('general_comments')->nullable();
            $table->enum('recommendation', ['highly_recommended', 'recommended', 'needs_improvement', 'not_recommended'])->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['internship_placement_id', 'evaluation_period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluations');
    }
};
