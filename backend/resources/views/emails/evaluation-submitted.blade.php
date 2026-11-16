<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .card { background-color: #ffffff; border-radius: 16px; padding: 32px; max-width: 540px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
        .header { text-align: center; margin-bottom: 24px; }
        .score { font-size: 32px; font-weight: 800; color: #4f46e5; margin: 8px 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff !important; padding: 12px 24px; border-radius: 10px; font-weight: 600; text-decoration: none; margin-top: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h2 style="margin: 0; color: #0f172a;">Evaluation Submitted</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">{{ ucfirst($evaluation->evaluation_type) }} Performance Review</p>
        </div>

        <p>Hello <strong>{{ $evaluation->studentProfile->full_name }}</strong>,</p>
        <p>Your internship supervisor at <strong>{{ $evaluation->companyProfile->company_name }}</strong> has submitted your official evaluation report.</p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <div style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600;">Overall Rating</div>
            <div class="score">{{ number_format($evaluation->overall_score ?? $evaluation->overall_rating ?? 0, 2) }} / 5.00</div>
            <p style="margin: 0; font-size: 13px; color: #475569;">"{{ $evaluation->general_comments ?? $evaluation->remarks ?? 'Great effort and performance.' }}"</p>
        </div>

        <div style="text-align: center;">
            <a href="{{ rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/') }}/student/dashboard" class="btn">View Evaluation Report</a>
        </div>
    </div>
</body>
</html>
