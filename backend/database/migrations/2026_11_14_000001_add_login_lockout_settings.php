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
            $table->unsignedInteger('login_failed_attempts')->default(0);
            $table->timestamp('login_locked_until')->nullable();
        });

        $now = now();
        foreach ([
            ['key' => 'login_max_attempts', 'value' => '3', 'label' => 'Maximum Failed Login Attempts', 'type' => 'number', 'group' => 'security'],
            ['key' => 'login_cooldown_minutes', 'value' => '60', 'label' => 'Login Cooldown (minutes)', 'type' => 'number', 'group' => 'security'],
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
            $table->dropColumn(['login_failed_attempts', 'login_locked_until']);
        });

        DB::table('system_settings')->whereIn('key', ['login_max_attempts', 'login_cooldown_minutes'])->delete();
    }
};
