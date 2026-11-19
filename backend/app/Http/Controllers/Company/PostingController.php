<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\InternshipPosting;
use App\Models\SystemSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PostingController extends Controller
{
    public function index(Request $request): View
    {
        $company = $request->user()->companyProfile;

        $postings = $company
            ? $company->internshipPostings()->latest()->paginate(10)
            : collect();

        return view('company.postings.index', compact('postings'));
    }

    public function create(): View
    {
        return view('company.postings.create', ['posting' => new InternshipPosting]);
    }

    public function store(Request $request): RedirectResponse
    {
        $company = $request->user()->companyProfile;

        if (! $company || ! $company->isVerified()) {
            return back()->with('error', 'Your company must be verified before posting internships.');
        }

        $validated = $this->validatePosting($request);
        $validated['required_hours'] ??= (int) SystemSetting::get('default_required_hours', 480);

        $company->internshipPostings()->create(array_merge($validated, ['status' => 'pending']));

        return redirect()->route('company.postings.index')
            ->with('success', 'Internship posting submitted for review.');
    }

    public function edit(Request $request, InternshipPosting $posting): View
    {
        $this->authorizePosting($request, $posting);

        return view('company.postings.edit', compact('posting'));
    }

    public function update(Request $request, InternshipPosting $posting): RedirectResponse
    {
        $this->authorizePosting($request, $posting);

        $validated = $this->validatePosting($request);
        $posting->update(array_merge($validated, ['status' => 'pending']));

        return redirect()->route('company.postings.index')
            ->with('success', 'Posting updated and re-submitted for review.');
    }

    public function destroy(Request $request, InternshipPosting $posting): RedirectResponse
    {
        $this->authorizePosting($request, $posting);

        abort_if(
            in_array($posting->status, ['approved']) && $posting->applications()->exists(),
            403,
            'Cannot delete a posting that has applications.'
        );

        $posting->delete();

        return redirect()->route('company.postings.index')
            ->with('success', 'Posting deleted.');
    }

    private function authorizePosting(Request $request, InternshipPosting $posting): void
    {
        $company = $request->user()->companyProfile;
        abort_if(! $company || $posting->company_profile_id !== $company->id, 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePosting(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'position' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string'],
            'responsibilities' => ['nullable', 'string'],
            'qualifications' => ['nullable', 'string'],
            'required_skills' => ['nullable', 'array'],
            'required_skills.*' => ['string', 'max:100'],
            'required_course' => ['nullable', 'string', 'max:50'],
            'required_year_level' => ['nullable', 'string', 'max:20'],
            'slots' => ['required', 'integer', 'min:1', 'max:100'],
            'duration_months' => ['nullable', 'integer', 'min:1', 'max:24'],
            'required_hours' => ['nullable', 'integer', 'min:1'],
            'location' => ['required', 'string', 'max:200'],
            'work_setup' => ['required', 'in:on-site,remote,hybrid'],
            'is_paid' => ['boolean'],
            'allowance' => ['nullable', 'numeric', 'min:0'],
            'application_deadline' => ['nullable', 'date', 'after:today'],
            'internship_start' => ['nullable', 'date'],
            'internship_end' => ['nullable', 'date', 'after:internship_start'],
        ]);

        $validated['is_paid'] = $request->boolean('is_paid');

        return $validated;
    }
}
