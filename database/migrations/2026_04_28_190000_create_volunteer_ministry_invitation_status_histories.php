<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('volunteer_ministry_invitation_status_histories')) {
            Schema::create('volunteer_ministry_invitation_status_histories', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('invitation_id');
                $table->unsignedBigInteger('church_id');
                $table->unsignedBigInteger('ministry_id');
                $table->unsignedBigInteger('volunteer_id');
                $table->unsignedBigInteger('changed_by_user_id')->nullable();

                $table->string('from_status', 24)->nullable();
                $table->string('to_status', 24)->nullable();
                $table->text('note')->nullable();

                $table->timestamps();
            });
        }

        // Índices + FKs (idempotente): migração pode falhar a meio no MySQL por nomes longos.
        try {
            Schema::table('volunteer_ministry_invitation_status_histories', function (Blueprint $table) {
                $table->index(['invitation_id', 'created_at'], 'vmi_hist_inv_created');
            });
        } catch (\Throwable) {
        }
        try {
            Schema::table('volunteer_ministry_invitation_status_histories', function (Blueprint $table) {
                $table->index(['church_id', 'ministry_id', 'created_at'], 'vmi_hist_ch_min_created');
            });
        } catch (\Throwable) {
        }

        try {
            Schema::table('volunteer_ministry_invitation_status_histories', function (Blueprint $table) {
                $table->foreign('invitation_id', 'vmi_hist_inv_fk')
                    ->references('id')->on('volunteer_ministry_invitations')
                    ->cascadeOnDelete();
            });
        } catch (\Throwable) {
        }
        try {
            Schema::table('volunteer_ministry_invitation_status_histories', function (Blueprint $table) {
                $table->foreign('church_id', 'vmi_hist_ch_fk')
                    ->references('id')->on('churches')
                    ->cascadeOnDelete();
            });
        } catch (\Throwable) {
        }
        try {
            Schema::table('volunteer_ministry_invitation_status_histories', function (Blueprint $table) {
                $table->foreign('ministry_id', 'vmi_hist_min_fk')
                    ->references('id')->on('ministries')
                    ->cascadeOnDelete();
            });
        } catch (\Throwable) {
        }
        try {
            Schema::table('volunteer_ministry_invitation_status_histories', function (Blueprint $table) {
                $table->foreign('volunteer_id', 'vmi_hist_vol_fk')
                    ->references('id')->on('volunteers')
                    ->cascadeOnDelete();
            });
        } catch (\Throwable) {
        }
        try {
            Schema::table('volunteer_ministry_invitation_status_histories', function (Blueprint $table) {
                $table->foreign('changed_by_user_id', 'vmi_hist_changed_by_fk')
                    ->references('id')->on('users')
                    ->nullOnDelete();
            });
        } catch (\Throwable) {
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('volunteer_ministry_invitation_status_histories');
    }
};

