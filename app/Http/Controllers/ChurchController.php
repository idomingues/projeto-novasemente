<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Support\VolunteerPipelineBootstrap;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
            'logo' => ['nullable', 'image', 'max:2048'],
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
            'youtube_playlist_url' => ['nullable', 'string', 'max:512'],
            'youtube_live_url' => ['nullable', 'string', 'max:512'],
            'ministry_invitation_intro' => ['nullable', 'string', 'max:5000'],
        ]);

        $church = Church::create(collect($data)->except('logo')->toArray());

        VolunteerPipelineBootstrap::seedDefaultStagesForChurch((int) $church->id);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('logos', 'public');
            $church->update(['logo_url' => $path]);
        }

        return redirect()->route('churches.index')->with('success', 'Igreja criada com sucesso.');
    }

    public function update(Request $request, Church $church)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', 'unique:churches,slug,'.$church->id],
            'logo' => ['nullable', 'image', 'max:2048'],
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
            'youtube_playlist_url' => ['nullable', 'string', 'max:512'],
            'youtube_live_url' => ['nullable', 'string', 'max:512'],
            'ministry_invitation_intro' => ['nullable', 'string', 'max:5000'],
        ]);

        if ($request->hasFile('logo')) {
            if ($church->logo_url && str_starts_with($church->logo_url, 'logos/')) {
                Storage::disk('public')->delete($church->logo_url);
            }
            $path = $request->file('logo')->store('logos', 'public');
            $data['logo_url'] = $path;
        }
        unset($data['logo']);

        $church->update($data);

        return redirect()->route('churches.index')->with('success', 'Igreja atualizada com sucesso.');
    }

    public function destroy(Church $church)
    {
        $church->delete();

        return redirect()->route('churches.index')->with('success', 'Igreja removida com sucesso.');
    }
}
