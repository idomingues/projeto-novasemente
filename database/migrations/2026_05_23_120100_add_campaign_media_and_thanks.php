<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donation_campaigns', function (Blueprint $table) {
            $table->string('story_video_url', 512)->nullable()->after('cover_image_path');
            $table->text('thanks_message')->nullable()->after('story_video_url');
            $table->timestamp('thanks_published_at')->nullable()->after('thanks_message');
        });

        Schema::create('donation_campaign_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('donation_campaigns')->cascadeOnDelete();
            $table->string('kind', 20);
            $table->string('image_path');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['campaign_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donation_campaign_photos');

        Schema::table('donation_campaigns', function (Blueprint $table) {
            $table->dropColumn(['story_video_url', 'thanks_message', 'thanks_published_at']);
        });
    }
};
