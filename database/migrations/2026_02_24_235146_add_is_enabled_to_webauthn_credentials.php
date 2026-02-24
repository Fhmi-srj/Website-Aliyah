<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('webauthn_credentials', function (Blueprint $table) {
            // Add is_enabled column (new version uses this instead of disabled_at)
            if (!Schema::hasColumn('webauthn_credentials', 'is_enabled')) {
                $table->boolean('is_enabled')->default(true)->after('alias');
            }

            // Remove disabled_at column if exists (replaced by is_enabled)
            // We keep disabled_at for safety to avoid data loss if rolling back
            // if (Schema::hasColumn('webauthn_credentials', 'disabled_at')) {
            //     $table->dropColumn('disabled_at');
            // }
        });
    }

    public function down(): void
    {
        Schema::table('webauthn_credentials', function (Blueprint $table) {
            if (Schema::hasColumn('webauthn_credentials', 'is_enabled')) {
                $table->dropColumn('is_enabled');
            }
        });
    }
};
