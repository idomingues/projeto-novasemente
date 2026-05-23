<?php

namespace App\Http\Controllers;

use App\Models\DonationCampaign;
use App\Models\DonationCampaignPhoto;
use App\Models\User;
use App\Services\CampaignThanksNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DonationCampaignMediaController extends Controller
{
    private function assertCanManage(?User $user): void
    {
        if (! $user) {
            abort(403);
        }
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return;
        }
        if ($user->can('campaigns.manage') || $user->can('finance.view')) {
            return;
        }
        abort(403);
    }

    public function updateStory(Request $request, DonationCampaign $donationCampaign): RedirectResponse
    {
        $this->assertCanManage($request->user());

        $data = $request->validate([
            'story_video_url' => ['nullable', 'string', 'max:512'],
        ]);

        $raw = trim((string) ($data['story_video_url'] ?? ''));
        if ($raw !== '' && DonationCampaign::youtubeEmbedUrl($raw) === null) {
            return redirect()->back()->withErrors([
                'story_video_url' => 'URL do YouTube inválida. Use um link de vídeo do YouTube.',
            ]);
        }

        $donationCampaign->update([
            'story_video_url' => $raw !== '' ? $raw : null,
        ]);

        return redirect()->back()->with('success', 'Vídeo da campanha atualizado.');
    }

    public function storePhoto(Request $request, DonationCampaign $donationCampaign): RedirectResponse
    {
        $this->assertCanManage($request->user());

        $data = $request->validate([
            'kind' => ['required', 'in:story,thanks'],
            'photo' => ['required', 'image', 'max:5120'],
        ]);

        if ($data['kind'] === DonationCampaignPhoto::KIND_THANKS
            && $donationCampaign->status === DonationCampaign::STATUS_ACTIVE) {
            return redirect()->back()->with('error', 'Encerre a campanha antes de adicionar fotos de agradecimento.');
        }

        $maxOrder = (int) $donationCampaign->photos()
            ->where('kind', $data['kind'])
            ->max('sort_order');

        $path = $request->file('photo')->store('donations/campaign-media', 'public');

        DonationCampaignPhoto::create([
            'campaign_id' => $donationCampaign->id,
            'kind' => $data['kind'],
            'image_path' => $path,
            'sort_order' => $maxOrder + 1,
        ]);

        return redirect()->back()->with('success', 'Foto adicionada.');
    }

    public function destroyPhoto(Request $request, DonationCampaign $donationCampaign, DonationCampaignPhoto $photo): RedirectResponse
    {
        $this->assertCanManage($request->user());

        if ($photo->campaign_id !== $donationCampaign->id) {
            abort(404);
        }

        Storage::disk('public')->delete($photo->image_path);
        $photo->delete();

        return redirect()->back()->with('success', 'Foto removida.');
    }

    public function publishThanks(Request $request, DonationCampaign $donationCampaign): RedirectResponse
    {
        $this->assertCanManage($request->user());

        if (! in_array($donationCampaign->status, [DonationCampaign::STATUS_CLOSED, DonationCampaign::STATUS_ARCHIVED], true)) {
            return redirect()->back()->with('error', 'Encerre a campanha antes de publicar o agradecimento.');
        }

        $data = $request->validate([
            'thanks_message' => ['required', 'string', 'max:10000'],
            'notify_donors' => ['boolean'],
        ]);

        $donationCampaign->update([
            'thanks_message' => $data['thanks_message'],
            'thanks_published_at' => now(),
        ]);

        $success = 'Agradecimento publicado no app.';

        if ($request->boolean('notify_donors')) {
            $donationCampaign->loadMissing(['church']);
            $result = app(CampaignThanksNotifier::class)->notifyAllDonors($donationCampaign);

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

    public function unpublishThanks(Request $request, DonationCampaign $donationCampaign): RedirectResponse
    {
        $this->assertCanManage($request->user());

        $donationCampaign->update([
            'thanks_published_at' => null,
        ]);

        return redirect()->back()->with('success', 'Agradecimento ocultado do app.');
    }
}
