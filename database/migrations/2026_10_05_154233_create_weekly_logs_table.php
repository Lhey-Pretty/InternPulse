<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weekly_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('internship_placement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_profile_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('week_number');
            $table->date('week_start');
            $table->date('week_end');
            $table->text('activities_done');
            $table->text('learnings')->nullable();
            $table->text('challenges')->nullable();
            $table->decimal('hours_this_week', 4, 2)->default(0);
            $table->enum('status', ['draft', 'submitted', 'reviewed'])->default('draft');
            $table->text('supervisor_remarks')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['internship_placement_id', 'week_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_logs');
    }
};
