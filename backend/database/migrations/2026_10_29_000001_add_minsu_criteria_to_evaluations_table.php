<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evaluations', function (Blueprint $table) {
            // MinSU Official 12 Evaluation Criteria
            $table->decimal('comprehension', 3, 1)->nullable()->after('evaluation_period');
            $table->decimal('work_habits', 3, 1)->nullable()->after('comprehension');
            // work_quality & work_quantity already exist
            $table->decimal('cooperation', 3, 1)->nullable()->after('work_quantity');
            $table->decimal('attendance_punctuality', 3, 1)->nullable()->after('cooperation');
            $table->decimal('judgment', 3, 1)->nullable()->after('attendance_punctuality');
            $table->decimal('attitude', 3, 1)->nullable()->after('judgment');
            $table->decimal('safety', 3, 1)->nullable()->after('attitude');
            $table->decimal('honesty_dependability', 3, 1)->nullable()->after('safety');
            $table->decimal('leadership', 3, 1)->nullable()->after('honesty_dependability');
            $table->decimal('personal_characteristics', 3, 1)->nullable()->after('leadership');

            // MinSU Official 60-point scale & conversion
            $table->unsignedSmallInteger('total_points')->nullable()->after('overall_rating');
            $table->unsignedTinyInteger('equivalent_rating')->nullable()->after('total_points');

            // Metadata from official form
            $table->string('rated_by_name')->nullable()->after('submitted_at');
            $table->string('inclusive_training_period')->nullable()->after('rated_by_name');
            $table->string('agency_address')->nullable()->after('inclusive_training_period');
        });
    }

    public function down(): void
    {
        Schema::table('evaluations', function (Blueprint $table) {
            $table->dropColumn([
                'comprehension',
                'work_habits',
                'cooperation',
                'attendance_punctuality',
                'judgment',
                'attitude',
                'safety',
                'honesty_dependability',
                'leadership',
                'personal_characteristics',
                'total_points',
                'equivalent_rating',
                'rated_by_name',
                'inclusive_training_period',
                'agency_address',
            ]);
        });
    }
};
