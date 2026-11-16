<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\StudentProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ResumeViewController extends Controller
{
    /**
     * Company views a student's resume (via their application).
     * Auth: company must own a posting the student applied to.
     */
    public function viewByApplication(Request $request, Application $application): StreamedResponse
    {
        $this->authorizeApplication($request, $application);

        $resumePath = $application->resume_path ?? $application->studentProfile->resume_path;

        abort_if(! $resumePath, 404, 'No resume on file.');
        abort_if(! Storage::disk('public')->exists($resumePath), 404, 'Resume file not found.');

        $path     = Storage::disk('public')->path($resumePath);
        $ext      = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime     = $ext === 'pdf' ? 'application/pdf' : 'application/octet-stream';
        $name     = $application->studentProfile->full_name ?? 'Student';
        $filename = "Resume_{$name}.{$ext}";

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
     * Direct view by student profile ID — for coordinator/admin access.
     */
    public function viewByStudent(Request $request, StudentProfile $studentProfile): StreamedResponse
    {
        $resumePath = $studentProfile->resume_path;

        abort_if(! $resumePath, 404, 'No resume on file.');
        abort_if(! Storage::disk('public')->exists($resumePath), 404, 'Resume file not found.');

        $path     = Storage::disk('public')->path($resumePath);
        $ext      = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime     = $ext === 'pdf' ? 'application/pdf' : 'application/octet-stream';
        $filename = "Resume_{$studentProfile->full_name}.{$ext}";

        return response()->streamDownload(
            fn () => readfile($path),
            $filename,
            [
                'Content-Type'        => $mime,
                'Content-Disposition' => "inline; filename=\"{$filename}\"",
            ]
        );
    }

    private function authorizeApplication(Request $request, Application $application): void
    {
        $company    = $request->user()->companyProfile;
        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();
        abort_if(! $postingIds->contains($application->internship_posting_id), 403);
    }
}
