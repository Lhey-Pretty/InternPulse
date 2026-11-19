<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_profiles', function (Blueprint $table) {
            $table->enum('eligibility_status', ['eligible', 'needs_review', 'disqualified'])->default('eligible')->after('verified_by');
            $table->text('eligibility_notes')->nullable()->after('eligibility_status');
            $table->timestamp('eligibility_reviewed_at')->nullable()->after('eligibility_notes');
        });
    }

    public function down(): void
    {
        Schema::table('company_profiles', function (Blueprint $table) {
            $table->dropColumn(['eligibility_status', 'eligibility_notes', 'eligibility_reviewed_at']);
        });
    }
};
