<!doctype html>
<html>
<body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6">
    <h2>Hi {{ $studentName }},</h2>
    <p>Your {{ $program }} student account registration has been received and is still being processed for approval by your program coordinator.</p>
    <p>You will be able to sign in and access your dashboard after your account is approved. We will notify you when the review is complete.</p>
    <p>After approval, sign in here: <a href="{{ rtrim(config('app.frontend_url'), '/') }}/login">MinSU InternPulse Login</a></p>
    <p>MinSU InternPulse</p>
</body>
</html>
