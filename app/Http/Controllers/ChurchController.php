<?php

namespace App\Http\Controllers;

use App\Models\Church;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChurchController extends Controller
{
    public function index(Request $request): Response
    {
        $churches = Church::orderBy('name')->get();

        return Inertia::render('Churches/Index', [
            'churches' => $churches,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', 'unique:churches,slug'],
            'logo_url' => ['nullable', 'string', 'max:1024'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'active' => ['boolean'],
            'email' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'whatsapp' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
            'pix_key' => ['nullable', 'string', 'max:255'],
            'donation_url' => ['nullable', 'string', 'max:1024'],
        ]);

        Church::create($data);

        return redirect()->route('churches.index')->with('success', 'Igreja criada com sucesso.');
    }

    public function update(Request $request, Church $church)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', 'unique:churches,slug,' . $church->id],
            'logo_url' => ['nullable', 'string', 'max:1024'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'active' => ['boolean'],
            'email' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'whatsapp' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
            'pix_key' => ['nullable', 'string', 'max:255'],
            'donation_url' => ['nullable', 'string', 'max:1024'],
        ]);

        $church->update($data);

        return redirect()->route('churches.index')->with('success', 'Igreja atualizada com sucesso.');
    }

    public function destroy(Church $church)
    {
        $church->delete();

        return redirect()->route('churches.index')->with('success', 'Igreja removida com sucesso.');
    }
}

