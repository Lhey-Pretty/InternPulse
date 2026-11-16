<?php

namespace App\Console\Commands;

use App\Models\AttendanceLog;
use Carbon\Carbon;
use Illuminate\Console\Command;

class BackfillAttendanceHours extends Command
{
    protected $signature = 'attendance:backfill-hours';

    protected $description = 'Backfill hours_rendered for attendance logs that have time_in and time_out but NULL hours_rendered';

    public function handle(): int
    {
        $this->info('Starting backfill of attendance hours...');

        // Find logs with both time_in and time_out but NULL hours_rendered
        $logs = AttendanceLog::whereNotNull('time_in')
            ->whereNotNull('time_out')
            ->whereNull('hours_rendered')
            ->get();

        if ($logs->isEmpty()) {
            $this->info('No attendance logs need backfilling.');
            return self::SUCCESS;
        }

        $this->info("Found {$logs->count()} attendance logs to backfill.");

        $updated = 0;
        $errors = 0;

        foreach ($logs as $log) {
            try {
                $in = Carbon::parse($log->time_in);
                $out = Carbon::parse($log->time_out);
                $hoursRendered = round($in->floatDiffInHours($out), 2);

                $log->update(['hours_rendered' => $hoursRendered]);
                $updated++;

                $this->line("✓ Log ID {$log->id}: {$hoursRendered} hours");
            } catch (\Exception $e) {
                $errors++;
                $this->error("✗ Log ID {$log->id}: {$e->getMessage()}");
            }
        }

        $this->newLine();
        $this->info("Backfill complete!");
        $this->info("Updated: {$updated}");
        if ($errors > 0) {
            $this->warn("Errors: {$errors}");
        }

        // Now recalculate all placement totals
        $this->info('Recalculating placement totals...');
        
        $placements = \App\Models\InternshipPlacement::whereHas('attendanceLogs')->get();
        
        foreach ($placements as $placement) {
            $totalHours = $placement->attendanceLogs()
                ->whereNotNull('time_in_approved_at')
                ->whereNotNull('time_out_approved_at')
                ->sum('hours_rendered');
            
            $placement->update(['rendered_hours' => (int) round($totalHours)]);
            
            $this->line("✓ Placement ID {$placement->id}: {$totalHours} hours → {$placement->rendered_hours} hours");
        }

        $this->newLine();
        $this->info('All done! ✨');

        return self::SUCCESS;
    }
}
