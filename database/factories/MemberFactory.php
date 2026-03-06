<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Member>
 */
class MemberFactory extends Factory
{
    /**
     * Define the model's default state.
     * Funciona com ou sem Faker (produção usa --no-dev e não instala Faker).
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $faker = $this->faker ?? null;

        if ($faker !== null) {
            return [
                'name' => $faker->name(),
                'email' => $faker->unique()->safeEmail(),
                'phone' => $faker->phoneNumber(),
                'birth_date' => $faker->date(),
                'address' => $faker->address(),
                'status' => $faker->randomElement(['active', 'inactive']),
            ];
        }

        // Produção (sem Faker): dados simples para o seed passar
        $n = (string) mt_rand(1000, 9999);
        return [
            'name' => 'Membro ' . $n,
            'email' => 'membro-' . $n . '@example.com',
            'phone' => null,
            'birth_date' => null,
            'address' => null,
            'status' => 'active',
        ];
    }
}
