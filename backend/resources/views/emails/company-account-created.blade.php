<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .card { background-color: #ffffff; border-radius: 16px; padding: 32px; max-width: 540px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { background: linear-gradient(135deg, #6366f1, #a855f7); width: 44px; height: 44px; border-radius: 12px; margin: 0 auto 12px; display: inline-block; line-height: 44px; color: white; font-weight: bold; font-size: 20px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff !important; padding: 12px 24px; border-radius: 10px; font-weight: 600; text-decoration: none; margin-top: 20px; text-align: center; }
        .details { background-color: #f1f5f9; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 14px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="logo"></div>
            <h2 style="margin: 0; color: #0f172a;">Welcome to InternPulse</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Partner Company Account</p>
        </div>

        <p>Hello <strong>{{ $companyProfile->company_name }}</strong> team,</p>
        <p>An institutional partner account has been created for your organization to collaborate on student internships and performance evaluation.</p>

        <div class="details">
            <p style="margin: 0 0 8px;"><strong>Login Email:</strong> {{ $user->email }}</p>
            @if($temporaryPassword)
                <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">{{ $temporaryPassword }}</code></p>
            @endif
        </div>

        <p style="font-size: 13px; color: #64748b;">Please log in and update your security credentials and complete company profile details.</p>

        <div style="text-align: center;">
            <a href="{{ rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/') }}/login" class="btn">Log In to Dashboard</a>
        </div>
    </div>
</body>
</html>
