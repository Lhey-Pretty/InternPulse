<?php

use App\Jobs\ClassifyJournalEntry;
use App\Models\JournalEntry;
use App\Services\JournalClassificationService;
use Illuminate\Support\Facades\Queue;

test('journal classification is queued so saving a journal does not wait for ML', function () {
    Queue::fake();

    $entry = new JournalEntry();
    $entry->setAttribute('id', 123);

    JournalClassificationService::classifyJournalEntry($entry);

    Queue::assertPushed(ClassifyJournalEntry::class, fn (ClassifyJournalEntry $job) => $job->journalEntryId === 123);
});
