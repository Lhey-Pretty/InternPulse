<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ResumeController extends Controller
{
    /**
     * Stream the student's own resume for inline viewing.
     */
    public function view(Request $request): StreamedResponse|Response
    {
        $student = $request->user()->studentProfile;

        abort_if(! $student || ! $student->resume_path, 404);

        abort_if(! Storage::disk('public')->exists($student->resume_path), 404, 'Resume file not found.');

        $path     = Storage::disk('public')->path($student->resume_path);
        $ext      = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime     = $ext === 'pdf' ? 'application/pdf' : 'application/octet-stream';
        $filename = basename($path);

        return response()->streamDownload(
            fn () => readfile($path),
            $filename,
            [
                'Content-Type'        => $mime,
                'Content-Disposition' => "inline; filename=\"{$filename}\"",
            ]
        );
    }

    /**
     * Download the student's own resume.
     */
    public function download(Request $request): StreamedResponse|Response
    {
        $student = $request->user()->studentProfile;

        abort_if(! $student || ! $student->resume_path, 404);
        abort_if(! Storage::disk('public')->exists($student->resume_path), 404);

        return Storage::disk('public')->download($student->resume_path, 'Resume_'.($student->full_name ?? 'student').'.'.pathinfo($student->resume_path, PATHINFO_EXTENSION));
    }
}
