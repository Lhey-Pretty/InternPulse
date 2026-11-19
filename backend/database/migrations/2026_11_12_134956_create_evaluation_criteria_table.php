<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluation_criteria', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['student', 'company'])->default('student'); // student or company evaluation
            $table->string('field_name'); // e.g., 'comprehension'
            $table->string('label'); // e.g., 'Comprehension'
            $table->text('description')->nullable(); // Optional description/guidance
            $table->integer('order')->default(0); // Display order
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            // Unique constraint on type + field_name combination
            $table->unique(['type', 'field_name']);
        });

        // Seed with the default 12 MinSU OJT criteria for STUDENTS
        DB::table('evaluation_criteria')->insert([
            ['type' => 'student', 'field_name' => 'comprehension', 'label' => 'Comprehension', 'description' => 'Ability to understand instructions and concepts', 'order' => 1, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'student', 'field_name' => 'work_habits', 'label' => 'Work Habits and Attitude', 'description' => 'Professional work ethic and positive attitude', 'order' => 2, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'student', 'field_name' => 'work_quality', 'label' => 'Quality of Work', 'description' => 'Standard and accuracy of work output', 'order' => 3, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'student', 'field_name' => 'work_quantity', 'label' => 'Quantity of Work', 'description' => 'Volume and productivity of work completed', 'order' => 4, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'student', 'field_name' => 'cooperation', 'label' => 'Cooperation', 'description' => 'Ability to work well with others', 'order' => 5, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'student', 'field_name' => 'attendance_punctuality', 'label' => 'Attendance and Punctuality', 'description' => 'Regularity and timeliness', 'order' => 6, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'student', 'field_name' => 'judgment', 'label' => 'Judgment', 'description' => 'Decision-making and problem-solving ability', 'order' => 7, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'student', 'field_name' => 'attitude', 'label' => 'Attitude', 'description' => 'Overall demeanor and approach to work', 'order' => 8, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'student', 'field_name' => 'safety', 'label' => 'Safety', 'description' => 'Adherence to safety protocols and practices', 'order' => 9, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'student', 'field_name' => 'honesty_dependability', 'label' => 'Honesty and Dependability', 'description' => 'Trustworthiness and reliability', 'order' => 10, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'student', 'field_name' => 'leadership', 'label' => 'Leadership', 'description' => 'Initiative and ability to guide others', 'order' => 11, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'student', 'field_name' => 'personal_characteristics', 'label' => 'Personal Characteristics', 'description' => 'Overall personality and character traits', 'order' => 12, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
        
        // Seed default criteria for COMPANY evaluations (by students rating the company)
        DB::table('evaluation_criteria')->insert([
            ['type' => 'company', 'field_name' => 'training_quality', 'label' => 'Training Quality', 'description' => 'Quality of training and mentorship provided', 'order' => 1, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'company', 'field_name' => 'workplace_environment', 'label' => 'Workplace Environment', 'description' => 'Work atmosphere and conditions', 'order' => 2, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'company', 'field_name' => 'supervision_support', 'label' => 'Supervision & Support', 'description' => 'Supervisor guidance and availability', 'order' => 3, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'company', 'field_name' => 'learning_opportunities', 'label' => 'Learning Opportunities', 'description' => 'Variety and relevance of tasks assigned', 'order' => 4, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'company', 'field_name' => 'professionalism', 'label' => 'Professionalism', 'description' => 'Professional standards and conduct', 'order' => 5, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'company', 'field_name' => 'communication', 'label' => 'Communication', 'description' => 'Clear expectations and feedback', 'order' => 6, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'company', 'field_name' => 'resources_facilities', 'label' => 'Resources & Facilities', 'description' => 'Equipment and tools provided', 'order' => 7, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'company', 'field_name' => 'work_life_balance', 'label' => 'Work-Life Balance', 'description' => 'Reasonable hours and workload', 'order' => 8, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_criteria');
    }
};
