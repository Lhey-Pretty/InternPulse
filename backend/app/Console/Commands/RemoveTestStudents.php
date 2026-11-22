<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\TestStudentAccounts;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class RemoveTestStudents extends Command
{
    protected $signature = 'students:remove-test {--dry-run : List students with Test in their name without deleting them}';

    protected $description = 'Move only students with a Test marker in their name to Trash while preserving their related records';

    public function handle(): int
    {
        if (! Schema::hasColumn('users', 'deleted_at')) {
            $this->error('Apply the soft-delete migration before removing test students.');
            return self::FAILURE;
        }

        $matches = User::where('role', 'student')->with('studentProfile')->get()
            ->map(fn (User $user) => ['user' => $user, 'source' => TestStudentAccounts::reason($user)])
            ->filter(fn (array $item) => $item['source'] !== null);

        if ($matches->isEmpty()) {
            $this->info('No students with a Test name marker remain in active records.');
            return self::SUCCESS;
        }

        $this->table(['ID', 'Name', 'Reason'], $matches->map(fn (array $item) => [
            $item['user']->id, $item['user']->name, $item['source'],
        ])->all());

        if ($this->option('dry-run')) {
            $this->info($matches->count().' matching test student account(s). No records changed.');
            return self::SUCCESS;
        }

        DB::transaction(function () use ($matches): void {
            foreach ($matches as $item) {
                $user = $item['user'];
                $user->delete();
                AuditLog::record('test_student.removed', $user, ['source' => $item['source']]);
            }
        });

        $this->info($matches->count().' test student account(s) moved to Trash. Related records were preserved.');
        return self::SUCCESS;
    }
}
