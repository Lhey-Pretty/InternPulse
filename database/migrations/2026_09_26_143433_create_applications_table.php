<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('internship_posting_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['pending', 'shortlisted', 'interview', 'accepted', 'rejected', 'withdrawn'])->default('pending');
            $table->text('cover_letter')->nullable();
            $table->string('resume_path')->nullable();
            $table->decimal('match_score', 5, 2)->nullable(); // ML match percentage
            $table->json('match_details')->nullable();        // ML match breakdown
            $table->date('interview_date')->nullable();
            $table->time('interview_time')->nullable();
            $table->string('interview_location')->nullable();
            $table->text('interview_notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('applied_at')->useCurrent();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['student_profile_id', 'internship_posting_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
