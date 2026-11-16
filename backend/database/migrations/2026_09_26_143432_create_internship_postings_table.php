<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('internship_postings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_profile_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('position');
            $table->text('description');
            $table->text('responsibilities')->nullable();
            $table->text('qualifications')->nullable();
            $table->json('required_skills')->nullable();  // array of skill names/ids
            $table->string('required_course')->nullable(); // e.g., BSIT, BSCS
            $table->string('required_year_level')->nullable();
            $table->integer('slots')->default(1);
            $table->integer('duration_months')->nullable();
            $table->integer('required_hours')->default(480);
            $table->string('location');
            $table->enum('work_setup', ['on-site', 'remote', 'hybrid'])->default('on-site');
            $table->boolean('is_paid')->default(false);
            $table->decimal('allowance', 10, 2)->nullable();
            $table->date('application_deadline')->nullable();
            $table->date('internship_start')->nullable();
            $table->date('internship_end')->nullable();
            $table->enum('status', ['draft', 'pending', 'approved', 'rejected', 'closed'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('internship_postings');
    }
};
