@echo off
cd /d "c:\laragon\www\InternPulse\backend"
php artisan queue:work --tries=3 --timeout=90
