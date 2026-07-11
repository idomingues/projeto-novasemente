<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weekly_programs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained('churches')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 0=domingo … 6=sábado
            $table->string('when_label', 64);
            $table->string('title')->nullable();
            $table->text('body')->nullable();
            $table->json('lines')->nullable();
            $table->string('time_mode', 16)->default('fixed'); // fixed | sunset
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('display_time', 64)->nullable();
            $table->string('home_message')->nullable();
            $table->string('image_url', 512)->nullable();
            $table->boolean('show_on_home')->default(true);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['church_id', 'is_active', 'sort_order']);
        });

        $churchId = DB::table('churches')->orderBy('id')->value('id');
        if ($churchId === null) {
            return;
        }

        $now = now();
        $rows = [
            [
                'day_of_week' => 3,
                'when_label' => 'QUA 20H',
                'title' => 'CULTO DE ORAÇÃO',
                'body' => 'Momento de oração, intercessão e intimidade com Deus em comunhão com a igreja. Todos são bem-vindos.',
                'lines' => null,
                'time_mode' => 'fixed',
                'start_time' => '20:00:00',
                'display_time' => '20:00',
                'home_message' => 'Todos são bem-vindos.',
                'image_url' => null,
                'sort_order' => 10,
            ],
            [
                'day_of_week' => 5,
                'when_label' => 'SEX',
                'title' => 'INÍCIO DO SÁBADO',
                'body' => 'O sábado começa com o pôr do sol. Prepare seu coração para este dia sagrado.',
                'lines' => null,
                'time_mode' => 'sunset',
                'start_time' => null,
                'display_time' => null,
                'home_message' => 'Prepare seu coração para o sábado.',
                'image_url' => '/images/sabbath-sunset-bg.jpg',
                'sort_order' => 20,
            ],
            [
                'day_of_week' => 6,
                'when_label' => 'SÁB 9H30',
                'title' => '1º CULTO',
                'body' => 'Um momento de pausa, reflexão e conexão com Deus. Com música, mensagem e um ambiente preparado pra você viver uma experiência real com Deus.',
                'lines' => null,
                'time_mode' => 'fixed',
                'start_time' => '09:30:00',
                'display_time' => '09:30',
                'home_message' => 'Uma experiência real com Deus.',
                'image_url' => null,
                'sort_order' => 30,
            ],
            [
                'day_of_week' => 6,
                'when_label' => 'SÁB 11H',
                'title' => 'ESTUDO',
                'body' => null,
                'lines' => json_encode([
                    'SEMENTINHA 0 a 16 anos',
                    'NOVA ESSÊNCIA a partir dos 17 anos',
                    'CONVIVA a partir dos 21 anos',
                ], JSON_UNESCAPED_UNICODE),
                'time_mode' => 'fixed',
                'start_time' => '11:00:00',
                'display_time' => '11:00',
                'home_message' => 'Escola Sabatina para todas as idades.',
                'image_url' => null,
                'sort_order' => 40,
            ],
            [
                'day_of_week' => 6,
                'when_label' => 'SÁB 12H',
                'title' => '2º CULTO',
                'body' => 'Um momento de pausa, reflexão e conexão com Deus. Com música, mensagem e um ambiente preparado pra você viver uma experiência real com Deus.',
                'lines' => null,
                'time_mode' => 'fixed',
                'start_time' => '12:00:00',
                'display_time' => '12:00',
                'home_message' => 'Uma experiência real com Deus.',
                'image_url' => null,
                'sort_order' => 45,
            ],
            [
                'day_of_week' => 6,
                'when_label' => 'SÁB 15H',
                'title' => 'CLASSE COMEÇOS',
                'body' => 'Pra quem está dando os primeiros passos na fé ou quer recomeçar sua caminhada com Deus. Um espaço de aprendizado, acolhimento e descoberta.',
                'lines' => null,
                'time_mode' => 'fixed',
                'start_time' => '15:00:00',
                'display_time' => '15:00',
                'home_message' => 'Acolhimento e descoberta na fé.',
                'image_url' => null,
                'sort_order' => 50,
            ],
            [
                'day_of_week' => 6,
                'when_label' => 'SÁB',
                'title' => 'DESPEDIDA DO SÁBADO',
                'body' => 'O sábado termina com o pôr do sol. Agradeça a Deus por este dia sagrado.',
                'lines' => null,
                'time_mode' => 'sunset',
                'start_time' => null,
                'display_time' => null,
                'home_message' => 'Agradeça a Deus por este dia sagrado.',
                'image_url' => '/images/sabbath-sunset-bg.jpg',
                'sort_order' => 60,
            ],
        ];

        foreach ($rows as $row) {
            DB::table('weekly_programs')->insert(array_merge($row, [
                'church_id' => $churchId,
                'end_time' => null,
                'show_on_home' => true,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_programs');
    }
};
