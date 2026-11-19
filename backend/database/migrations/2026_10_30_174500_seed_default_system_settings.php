<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $settings = [
            [
                'key' => 'academic_year',
                'value' => date('Y') . '-' . (date('Y') + 1),
                'label' => 'Academic Year',
                'type' => 'text',
                'group' => 'academic',
            ],
            [
                'key' => 'default_required_hours',
                'value' => '480',
                'label' => 'Default Required OJT Hours',
                'type' => 'number',
                'group' => 'academic',
            ],
            [
                'key' => 'application_review_enabled',
                'value' => '1',
                'label' => 'Application Review',
                'type' => 'boolean',
                'group' => 'applications',
            ],
            [
                'key' => 'recommendations_enabled',
                'value' => '1',
                'label' => 'Skill Recommendations',
                'type' => 'boolean',
                'group' => 'matching',
            ],
            [
                'key' => 'minimum_company_rating',
                'value' => '2.5',
                'label' => 'Minimum Company Rating',
                'type' => 'number',
                'group' => 'matching',
            ],
            [
                'key' => 'email_notifications_enabled',
                'value' => '1',
                'label' => 'Email Notifications',
                'type' => 'boolean',
                'group' => 'notifications',
            ],
            [
                'key' => 'maintenance_mode',
                'value' => '0',
                'label' => 'Maintenance Mode',
                'type' => 'boolean',
                'group' => 'system',
            ],
        ];

        foreach ($settings as $setting) {
            DB::table('system_settings')->updateOrInsert(
                ['key' => $setting['key']],
                array_merge($setting, [
                    'updated_at' => $now,
                    'created_at' => $now,
                ]),
            );
        }
    }

    public function down(): void
    {
        DB::table('system_settings')
            ->whereIn('key', [
                'academic_year',
                'default_required_hours',
                'application_review_enabled',
                'recommendations_enabled',
                'minimum_company_rating',
                'email_notifications_enabled',
                'maintenance_mode',
            ])
            ->delete();
    }
};
