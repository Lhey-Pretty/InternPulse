<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('password_changed_at')->nullable();
        });

        DB::table('users')->whereNull('password_changed_at')->update(['password_changed_at' => now()]);

        $now = now();
        foreach ([
            ['key' => 'password_expiry_days', 'value' => '90', 'label' => 'Password Expiration (days; 0 disables)', 'type' => 'number', 'group' => 'security'],
            ['key' => 'password_auth_enabled', 'value' => '1', 'label' => 'Email and Password Sign-in', 'type' => 'boolean', 'group' => 'authentication'],
            ['key' => 'google_auth_enabled', 'value' => '0', 'label' => 'Google Sign-in', 'type' => 'boolean', 'group' => 'authentication'],
        ] as $setting) {
            DB::table('system_settings')->updateOrInsert(
                ['key' => $setting['key']],
                array_merge($setting, ['updated_at' => $now, 'created_at' => $now]),
            );
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('password_changed_at');
        });

        DB::table('system_settings')->whereIn('key', [
            'password_expiry_days',
            'password_auth_enabled',
            'google_auth_enabled',
        ])->delete();
    }
};
