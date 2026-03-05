<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->string('serial_number')->nullable()->after('barcode');
            $table->string('category')->nullable()->after('name');
            $table->string('brand')->nullable()->after('category');
            $table->string('item_type')->nullable()->after('brand');
            $table->string('classification')->nullable()->after('item_type');
            $table->date('acquisition_date')->nullable()->after('location');
            $table->decimal('acquisition_value', 12, 2)->nullable()->after('acquisition_date');
            $table->decimal('current_value', 12, 2)->nullable()->after('acquisition_value');
            $table->string('status')->default('active')->after('current_value');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropColumn([
                'serial_number',
                'category',
                'brand',
                'item_type',
                'classification',
                'acquisition_date',
                'acquisition_value',
                'current_value',
                'status',
            ]);
        });
    }
};
