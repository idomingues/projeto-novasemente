<?php

namespace App\Http\Controllers;

use App\Models\CharityCampaign;
use App\Models\CharityCampaignPhoto;
use App\Models\User;
use App\Services\CharityCampaignThanksNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CharityCampaignMediaController extends Controller
{
    private function assertCanManage(?User $user): void
    {
        if (! $user) {
            abort(403);
        }
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return;
        }
        if ($user->can('donations.manage') || $user->can('finance.view')) {
            return;
        }
        abort(403);
    }

    public function updateStory(Request $request, CharityCampaign $charityCampaign): RedirectResponse
    {
        $this->assertCanManage($request->user());

        $data = $request->validate([
            'story_video_url' => ['nullable', 'string', 'max:512'],
        ]);

        $raw = trim((string) ($data['story_video_url'] ?? ''));
        if ($raw !== '' && CharityCampaign::youtubeEmbedUrl($raw) === null) {
            return redirect()->back()->withErrors([
                'story_video_url' => 'URL do YouTube inválida. Use um link de vídeo do YouTube.',
            ]);
        }

        $charityCampaign->update([
            'story_video_url' => $raw !== '' ? $raw : null,
        ]);

        return redirect()->back()->with('success', 'Vídeo da campanha atualizado.');
    }

    public function storePhoto(Request $request, CharityCampaign $charityCampaign): RedirectResponse
    {
        $this->assertCanManage($request->user());

        $data = $request->validate([
            'kind' => ['required', 'in:story,thanks'],
            'photo' => ['nullable', 'image', 'max:5120'],
            'photos' => ['nullable', 'array', 'min:1'],
            'photos.*' => ['image', 'max:5120'],
        ]);

        if ($data['kind'] === CharityCampaignPhoto::KIND_THANKS
            && $charityCampaign->status === CharityCampaign::STATUS_ACTIVE) {
            return redirect()->back()->with('error', 'Encerre a campanha antes de adicionar fotos de agradecimento.');
        }

        $photos = [];
        if ($request->hasFile('photos')) {
            $photos = array_values(array_filter((array) $request->file('photos')));
        } elseif ($request->hasFile('photo')) {
            $photos = [$request->file('photo')];
        }

        if ($photos === []) {
            return redirect()->back()->withErrors([
                'photos' => 'Selecione pelo menos uma foto.',
            ]);
        }

        $maxOrder = (int) $charityCampaign->photos()
            ->where('kind', $data['kind'])
            ->max('sort_order');

        foreach ($photos as $index => $photo) {
            $path = $photo->store('charity/campaign-media', 'public');

            CharityCampaignPhoto::create([
                'campaign_id' => $charityCampaign->id,
                'kind' => $data['kind'],
                'image_path' => $path,
                'sort_order' => $maxOrder + $index + 1,
            ]);
        }

        $count = count($photos);

        return redirect()->back()->with(
            'success',
            $count === 1 ? 'Foto adicionada.' : "{$count} fotos adicionadas."
        );
    }

    public function destroyPhoto(Request $request, CharityCampaign $charityCampaign, CharityCampaignPhoto $photo): RedirectResponse
    {
        $this->assertCanManage($request->user());

        if ($photo->campaign_id !== $charityCampaign->id) {
            abort(404);
        }

        Storage::disk('public')->delete($photo->image_path);
        $photo->delete();

        return redirect()->back()->with('success', 'Foto removida.');
    }

    public function publishThanks(Request $request, CharityCampaign $charityCampaign): RedirectResponse
    {
        $this->assertCanManage($request->user());

        if (! in_array($charityCampaign->status, [CharityCampaign::STATUS_CLOSED, CharityCampaign::STATUS_ARCHIVED], true)) {
            return redirect()->back()->with('error', 'Encerre a campanha antes de publicar o agradecimento.');
        }

        $data = $request->validate([
            'thanks_message' => ['required', 'string', 'max:10000'],
            'notify_donors' => ['boolean'],
        ]);

        $charityCampaign->update([
            'thanks_message' => $data['thanks_message'],
            'thanks_published_at' => now(),
        ]);

        $success = 'Agradecimento publicado no app.';

        if ($request->boolean('notify_donors')) {
            $charityCampaign->loadMissing(['church']);
            $result = app(CharityCampaignThanksNotifier::class)->notifyAllDonors($charityCampaign);

            if ($result['users_notified'] === 0 && $result['emails_sent'] === 0) {
                $success .= ' Nenhum doador com conta no app recebeu notificação ou e-mail (verifique preferências de contato).';
            } else {
                $parts = [];
                if ($result['users_notified'] > 0) {
                    $parts[] = $result['users_notified'].' notificação(ões) no app';
                }
                if ($result['emails_sent'] > 0) {
                    $parts[] = $result['emails_sent'].' e-mail(s)';
                }
                $success .= ' Enviado: '.implode(' e ', $parts).'.';
            }
        }

        return redirect()->back()->with('success', $success);
    }

    public function unpublishThanks(Request $request, CharityCampaign $charityCampaign): RedirectResponse
    {
        $this->assertCanManage($request->user());

        $charityCampaign->update([
            'thanks_published_at' => null,
        ]);

        return redirect()->back()->with('success', 'Agradecimento ocultado do app.');
    }
}
