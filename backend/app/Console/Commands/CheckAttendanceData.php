<?php

namespace App\Console\Commands;

use App\Models\AttendanceLog;
use App\Models\InternshipPlacement;
use Illuminate\Console\Command;

class CheckAttendanceData extends Command
{
    protected $signature = 'attendance:check';

    protected $description = 'Check attendance data and progress calculations';

    public function handle(): int
    {
        $this->info('=== Attendance Data Check ===');
        $this->newLine();

        // Check total logs
        $totalLogs = AttendanceLog::count();
        $this->info("Total attendance logs: {$totalLogs}");

        if ($totalLogs === 0) {
            $this->warn('No attendance logs found in database.');
            return self::SUCCESS;
        }

        // Check logs with NULL hours
        $nullHours = AttendanceLog::whereNull('hours_rendered')->count();
        $this->info("Logs with NULL hours_rendered: {$nullHours}");

        // Check logs with hours but no time_out
        $noTimeOut = AttendanceLog::whereNotNull('time_in')
            ->whereNull('time_out')
            ->count();
        $this->info("Logs with time_in but no time_out: {$noTimeOut}");

        // Check approved logs
        $fullyApproved = AttendanceLog::whereNotNull('time_in_approved_at')
            ->whereNotNull('time_out_approved_at')
            ->count();
        $this->info("Fully approved logs (both in/out): {$fullyApproved}");

        $partiallyApproved = AttendanceLog::where(function ($q) {
            $q->whereNotNull('time_in_approved_at')
              ->whereNull('time_out_approved_at');
        })->orWhere(function ($q) {
            $q->whereNull('time_in_approved_at')
              ->whereNotNull('time_out_approved_at');
        })->count();
        $this->info("Partially approved logs (only in or out): {$partiallyApproved}");

        $unapproved = AttendanceLog::whereNull('time_in_approved_at')
            ->whereNull('time_out_approved_at')
            ->whereNotNull('time_out')
            ->count();
        $this->info("Unapproved logs (both pending): {$unapproved}");

        $this->newLine();
        $this->info('=== Sample Logs ===');
        
        $sampleLogs = AttendanceLog::with('internshipPlacement.studentProfile.user')
            ->whereNotNull('time_out')
            ->limit(5)
            ->get();

        foreach ($sampleLogs as $log) {
            $studentName = $log->internshipPlacement->studentProfile->user->name ?? 'Unknown';
            $this->line("ID: {$log->id} | Student: {$studentName}");
            $this->line("  Time In: {$log->time_in} | Time Out: {$log->time_out}");
            $this->line("  Hours: {$log->hours_rendered}");
            $this->line("  In Approved: " . ($log->time_in_approved_at ? '✓' : '✗'));
            $this->line("  Out Approved: " . ($log->time_out_approved_at ? '✓' : '✗'));
            $this->newLine();
        }

        // Check placements
        $this->info('=== Placement Progress ===');
        
        $placements = InternshipPlacement::with('studentProfile.user')
            ->whereHas('attendanceLogs')
            ->limit(10)
            ->get();

        if ($placements->isEmpty()) {
            $this->warn('No placements with attendance logs found.');
            return self::SUCCESS;
        }

        foreach ($placements as $placement) {
            $studentName = $placement->studentProfile->user->name ?? 'Unknown';
            $totalLogs = $placement->attendanceLogs()->whereNotNull('time_out')->count();
            $approvedLogs = $placement->attendanceLogs()
                ->whereNotNull('time_in_approved_at')
                ->whereNotNull('time_out_approved_at')
                ->count();
            
            $this->line("Student: {$studentName}");
            $this->line("  Total logs: {$totalLogs} | Approved: {$approvedLogs}");
            $this->line("  Rendered hours: {$placement->rendered_hours} / {$placement->required_hours}");
            $this->line("  Progress: {$placement->completion_percentage}%");
            $this->newLine();
        }

        return self::SUCCESS;
    }
}
