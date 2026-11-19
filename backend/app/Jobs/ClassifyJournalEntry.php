<?php

namespace App\Jobs;

use App\Models\JournalEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class ClassifyJournalEntry implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 4;

    public array $backoff = [5, 30, 120];

    public int $timeout = 20;

    public function __construct(public int $journalEntryId) {}

    public function handle(): void
    {
        $entry = JournalEntry::with('studentProfile')->find($this->journalEntryId);
        if (! $entry) {
            return;
        }

        $course = $entry->studentProfile?->course;
        if (! $course) {
            $entry->update([
                'classification_status' => 'failed',
                'classification_feedback' => 'Student course information is missing; coordinator review is required.',
            ]);

            return;
        }

        $entry->update(['classification_status' => 'processing']);
        $baseUrl = rtrim((string) config('services.ml.url', env('ML_SERVICE_URL', 'http://127.0.0.1:8001')), '/');

        Http::timeout(5)
            ->retry(3, 200)
            ->post("{$baseUrl}/api/journal/analyze", [
                'journal_entry_id' => $entry->id,
                'journal_text' => trim($entry->title.'. '.$entry->content),
                'student_course' => $course,
                'callback_url' => route('api.journal-classification.store'),
            ])
            ->throw();

        Log::info("Submitted journal {$entry->id} for ML classification", ['course' => $course]);
    }

    public function failed(?Throwable $exception): void
    {
        JournalEntry::whereKey($this->journalEntryId)->update([
            'classification_status' => 'failed',
            'classification_feedback' => 'Automatic classification failed after retries; coordinator review is required.',
        ]);

        Log::error("Journal classification failed for entry {$this->journalEntryId}.", [
            'error' => $exception?->getMessage(),
        ]);
    }
}
