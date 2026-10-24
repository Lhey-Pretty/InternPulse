<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('placement_recommendations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('internship_posting_id')->constrained()->cascadeOnDelete();
            $table->foreignId('recommended_by')->nullable()->constrained('users')->nullOnDelete(); // coordinator or ML
            $table->enum('source', ['coordinator', 'ml'])->default('coordinator');
            $table->decimal('score', 5, 2)->nullable();
            $table->text('reason')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'rejected'])->default('pending');
            $table->text('coordinator_notes')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('placement_recommendations');
    }
};
