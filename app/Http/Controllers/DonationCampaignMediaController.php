<?php

namespace App\Http\Controllers;

use App\Models\DonationCampaign;
use App\Models\DonationCampaignPhoto;
use App\Models\User;
use App\Services\CampaignThanksNotifier;
use App\Support\ConstrucaoIgrejaStoryDefaults;
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

    public function updateCaixaFixoStory(Request $request, DonationCampaign $donationCampaign): RedirectResponse
    {
        $this->assertCanManage($request->user());

        $request->merge([
            'monthly_total' => $this->normalizeMoneyInput($request->input('monthly_total')),
        ]);

        $costItemsInput = $request->input('cost_items', []);
        if (is_array($costItemsInput)) {
            foreach ($costItemsInput as $index => $item) {
                if (is_array($item) && array_key_exists('amount', $item)) {
                    $costItemsInput[$index]['amount'] = $this->normalizeMoneyInput($item['amount']);
                }
            }
            $request->merge(['cost_items' => $costItemsInput]);
        }

        $annualLinesInput = $request->input('annual_lines', []);
        if (is_array($annualLinesInput)) {
            foreach ($annualLinesInput as $index => $line) {
                if (is_array($line) && array_key_exists('amount', $line)) {
                    $annualLinesInput[$index]['amount'] = $this->normalizeSignedMoneyInput($line['amount']);
                }
            }
            $request->merge(['annual_lines' => $annualLinesInput]);
        }

        $data = $request->validate([
            'monthly_total' => ['required', 'numeric', 'min:0.01', 'max:9999999999.99'],
            'annual_year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'cost_items' => ['required', 'array', 'min:1'],
            'cost_items.*.label' => ['required', 'string', 'max:255'],
            'cost_items.*.amount' => ['required', 'numeric', 'min:0', 'max:9999999999.99'],
            'cost_items.*.tone' => ['required', 'string', 'max:32'],
            'cost_items.*.compact' => ['sometimes', 'boolean'],
            'annual_lines' => ['required', 'array', 'min:1'],
            'annual_lines.*.label' => ['required', 'string', 'max:255'],
            'annual_lines.*.amount' => ['required', 'numeric', 'min:-9999999999.99', 'max:9999999999.99'],
            'annual_lines.*.tone' => ['required', 'string', 'max:32'],
            'annual_lines.*.emphasize' => ['sometimes', 'boolean'],
            'annual_lines.*.flow' => ['nullable', 'in:in,out'],
        ]);

        $monthlyTotal = round((float) $data['monthly_total'], 2);

        $costItems = [];
        foreach ($data['cost_items'] as $item) {
            $amount = round((float) $item['amount'], 2);
            $row = [
                'label' => $item['label'],
                'amount' => $amount,
                'percent' => $monthlyTotal > 0 ? round(($amount / $monthlyTotal) * 100, 2) : 0.0,
                'tone' => $item['tone'],
            ];
            if (! empty($item['compact'])) {
                $row['compact'] = true;
            }
            $costItems[] = $row;
        }

        $annualLines = [];
        foreach ($data['annual_lines'] as $line) {
            $row = [
                'label' => $line['label'],
                'amount' => round((float) $line['amount'], 2),
                'tone' => $line['tone'],
            ];
            if (! empty($line['emphasize'])) {
                $row['emphasize'] = true;
            }
            if (isset($line['flow']) && in_array($line['flow'], ['in', 'out'], true)) {
                $row['flow'] = $line['flow'];
            }
            $annualLines[] = $row;
        }

        $donationCampaign->update([
            'caixa_fixo_story' => [
                'monthly_total' => $monthlyTotal,
                'cost_items' => $costItems,
                'annual_year' => (int) $data['annual_year'],
                'annual_lines' => $annualLines,
            ],
            'show_caixa_fixo_story' => true,
            'show_construcao_story' => false,
        ]);

        return redirect()->back()->with('success', 'Valores do Caixa Fixo salvos.');
    }

    public function updateConstrucaoStory(Request $request, DonationCampaign $donationCampaign): RedirectResponse
    {
        $this->assertCanManage($request->user());

        $request->merge([
            'raised_amount' => $this->normalizeMoneyInput($request->input('raised_amount')),
        ]);

        $data = $request->validate([
            'launch_date' => ['required', 'date'],
            'as_of_date' => ['required', 'date', 'after_or_equal:launch_date'],
            'raised_amount' => ['required', 'numeric', 'min:0.01', 'max:9999999999.99'],
            'eyebrow' => ['nullable', 'string', 'max:120'],
            'title' => ['nullable', 'string', 'max:255'],
            'paragraphs' => ['nullable', 'array'],
            'paragraphs.*' => ['nullable', 'string', 'max:2000'],
            'highlights' => ['nullable', 'array'],
            'highlights.*' => ['nullable', 'string', 'max:500'],
        ]);

        $defaults = ConstrucaoIgrejaStoryDefaults::story();

        $paragraphs = isset($data['paragraphs']) && is_array($data['paragraphs'])
            ? array_values(array_filter(array_map(fn ($p) => is_string($p) ? trim($p) : '', $data['paragraphs'])))
            : [];
        if ($paragraphs === []) {
            $paragraphs = $defaults['paragraphs'];
        }

        $highlights = isset($data['highlights']) && is_array($data['highlights'])
            ? array_values(array_filter(array_map(fn ($h) => is_string($h) ? trim($h) : '', $data['highlights'])))
            : [];
        if ($highlights === []) {
            $highlights = $defaults['highlights'];
        }

        $donationCampaign->update([
            'construcao_story' => [
                'launch_date' => $data['launch_date'],
                'as_of_date' => $data['as_of_date'],
                'raised_amount' => round((float) $data['raised_amount'], 2),
                'eyebrow' => filled($data['eyebrow'] ?? null) ? trim((string) $data['eyebrow']) : $defaults['eyebrow'],
                'title' => filled($data['title'] ?? null) ? trim((string) $data['title']) : $defaults['title'],
                'paragraphs' => $paragraphs,
                'highlights' => $highlights,
            ],
            'show_construcao_story' => true,
            'show_caixa_fixo_story' => false,
        ]);

        return redirect()->back()->with('success', 'Valores da Construção salvos.');
    }

    private function normalizeMoneyInput(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $normalized = trim(str_replace('R$', '', $value));
        if ($normalized === '') {
            return $value;
        }

        if (str_contains($normalized, ',')) {
            $normalized = str_replace('.', '', $normalized);
            $normalized = str_replace(',', '.', $normalized);
        }

        return $normalized;
    }

    private function normalizeSignedMoneyInput(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $normalized = trim(str_replace(['R$', ' '], '', $value));
        if ($normalized === '') {
            return $value;
        }

        $negative = str_starts_with($normalized, '-') || str_starts_with($normalized, '−');
        $normalized = ltrim($normalized, "-−");

        if (str_contains($normalized, ',')) {
            $normalized = str_replace('.', '', $normalized);
            $normalized = str_replace(',', '.', $normalized);
        }

        if ($normalized === '' || ! is_numeric($normalized)) {
            return $value;
        }

        return $negative ? '-'.$normalized : $normalized;
    }

    public function storePhoto(Request $request, DonationCampaign $donationCampaign): RedirectResponse
    {
        $this->assertCanManage($request->user());

        $data = $request->validate([
            'kind' => ['required', 'in:story,thanks'],
            'photo' => ['nullable', 'image', 'max:5120'],
            'photos' => ['nullable', 'array', 'min:1'],
            'photos.*' => ['image', 'max:5120'],
        ]);

        if ($data['kind'] === DonationCampaignPhoto::KIND_THANKS
            && $donationCampaign->status === DonationCampaign::STATUS_ACTIVE) {
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

        $maxOrder = (int) $donationCampaign->photos()
            ->where('kind', $data['kind'])
            ->max('sort_order');

        foreach ($photos as $index => $photo) {
            $path = $photo->store('donations/campaign-media', 'public');

            DonationCampaignPhoto::create([
                'campaign_id' => $donationCampaign->id,
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
