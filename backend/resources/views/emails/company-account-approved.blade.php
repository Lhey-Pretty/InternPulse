<!doctype html>
<html>
<body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6">
    <h2>Welcome, {{ $contactPerson }}!</h2>
    <p>Your company account for <strong>{{ $companyName }}</strong> has been approved by the administrator.</p>
    <p>You can now sign in to MinSU InternPulse and access your company dashboard to post internship opportunities.</p>
    <p><a href="{{ rtrim(config('app.frontend_url'), '/') }}/login" style="display:inline-block;padding:12px 20px;background:#009688;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">Go to Login</a></p>
    <p>MinSU InternPulse</p>
</body>
</html>
