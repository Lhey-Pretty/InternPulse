<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add indexes for faster queries
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->index('first_name');
            $table->index('last_name');
            $table->index('student_id_number');
            $table->index('course');
            $table->index('user_id');
        });

        Schema::table('internship_placements', function (Blueprint $table) {
            $table->index('student_profile_id');
            $table->index('internship_posting_id');
            $table->index('status');
            $table->index(['student_profile_id', 'status']);
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->index('student_profile_id');
            $table->index('internship_posting_id');
            $table->index('status');
        });

        Schema::table('evaluations', function (Blueprint $table) {
            $table->index('student_profile_id');
            $table->index('internship_placement_id');
        });

        Schema::table('company_profiles', function (Blueprint $table) {
            $table->index('company_name');
            $table->index('verification_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->dropIndex(['first_name']);
            $table->dropIndex(['last_name']);
            $table->dropIndex(['student_id_number']);
            $table->dropIndex(['course']);
            $table->dropIndex(['user_id']);
        });

        Schema::table('internship_placements', function (Blueprint $table) {
            $table->dropIndex(['student_profile_id']);
            $table->dropIndex(['internship_posting_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['student_profile_id', 'status']);
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->dropIndex(['student_profile_id']);
            $table->dropIndex(['internship_posting_id']);
            $table->dropIndex(['status']);
        });

        Schema::table('evaluations', function (Blueprint $table) {
            $table->dropIndex(['student_profile_id']);
            $table->dropIndex(['internship_placement_id']);
        });

        Schema::table('company_profiles', function (Blueprint $table) {
            $table->dropIndex(['company_name']);
            $table->dropIndex(['verification_status']);
        });
    }
};
