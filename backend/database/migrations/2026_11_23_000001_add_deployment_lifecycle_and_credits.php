<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->decimal('ojt_required_hours', 10, 2)->nullable();
        });
        Schema::table('internship_placements', function (Blueprint $table) {
            $table->decimal('required_hours', 10, 2)->default(480)->change();
            $table->decimal('rendered_hours', 10, 2)->default(0)->change();
            $table->decimal('legacy_credited_hours', 10, 2)->default(0);
            $table->enum('status', ['active', 'completed', 'terminated', 'on_hold', 'transferred', 'pulled_out'])->default('active')->change();
            $table->foreignId('previous_placement_id')->nullable()->constrained('internship_placements')->nullOnDelete();
            $table->date('last_working_date')->nullable();
            $table->text('closure_reason')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
        });
        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->string('review_decision', 20)->nullable();
            $table->text('review_reason')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
        });

        $this->backfillCredits();
    }

    public function backfillCredits(): void
    {
        // Preserve credits with no attendance record. Pending recorded hours are
        // not silently converted to credits. Existing rendered totals stay intact.
        DB::table('internship_placements')->orderBy('id')->chunkById(250, function ($placements) {
            foreach ($placements as $placement) {
                $recorded = DB::table('attendance_logs')->where('internship_placement_id', $placement->id)->sum('hours_rendered');
                DB::table('internship_placements')->where('id', $placement->id)->update([
                    'legacy_credited_hours' => max(0, round($placement->rendered_hours - $recorded, 2)),
                ]);
                DB::table('student_profiles')->where('id', $placement->student_profile_id)
                    ->whereNull('ojt_required_hours')->update(['ojt_required_hours' => $placement->required_hours]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['review_decision', 'review_reason', 'reviewed_at']);
        });
        Schema::table('internship_placements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('previous_placement_id');
            $table->dropConstrainedForeignId('closed_by');
            $table->dropColumn(['legacy_credited_hours', 'last_working_date', 'closure_reason', 'closed_at']);
        });
        Schema::table('student_profiles', fn (Blueprint $table) => $table->dropColumn('ojt_required_hours'));
        // Keep decimal credits and lifecycle statuses to avoid truncation/data loss.
    }
};
