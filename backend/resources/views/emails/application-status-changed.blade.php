<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .card { background-color: #ffffff; border-radius: 16px; padding: 32px; max-width: 540px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
        .header { text-align: center; margin-bottom: 24px; }
        .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; text-transform: uppercase; background: #e0e7ff; color: #4338ca; }
        .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff !important; padding: 12px 24px; border-radius: 10px; font-weight: 600; text-decoration: none; margin-top: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h2 style="margin: 0; color: #0f172a;">Application Update</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">{{ $application->internshipPosting->title }}</p>
        </div>

        <p>Hello <strong>{{ $application->studentProfile->full_name }}</strong>,</p>
        <p>The status of your internship application with <strong>{{ $application->internshipPosting->companyProfile->company_name }}</strong> has been updated to:</p>

        <div style="text-align: center; margin: 24px 0;">
            <span class="badge">{{ str_replace('_', ' ', $newStatus) }}</span>
        </div>

        @if($application->interview_date)
            <p style="background: #eff6ff; padding: 12px; border-radius: 8px; font-size: 13px; color: #1e40af;">
                 <strong>Interview Scheduled:</strong> {{ $application->interview_date->format('M d, Y h:i A') }}
            </p>
        @endif

        <div style="text-align: center;">
            <a href="{{ rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/') }}/student/dashboard" class="btn">View Application Details</a>
        </div>
    </div>
</body>
</html>
