<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\DonationItemCampaign;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DonationItemCampaignController extends Controller
{
    private function assertCanManage(?User $user): void
    {
        if (! $user) {
            abort(403);
        }
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return;
        }
        if ($user->can('campaigns.manage')) {
            return;
        }
        abort(403);
    }

    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $canManage = $user !== null && ($user->can('campaigns.manage') || $user->hasAnyRole(['super_admin', 'admin']));

        if (! $canManage && ! $user?->can('campaigns.view')) {
            abort(403);
        }

        $churchId = $this->currentChurchId();
        $campaigns = DonationItemCampaign::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (DonationItemCampaign $c) => [
                'id' => $c->id,
                'title' => $c->title,
                'description' => $c->description,
                'goal_quantity' => (int) $c->goal_quantity,
                'collected_quantity' => (int) $c->collected_quantity,
                'remaining_quantity' => $c->remainingQuantity(),
                'progress_percent' => $c->progressPercent(),
                'unit_label' => $c->unit_label,
                'status' => $c->status,
                'ends_at' => $c->ends_at?->format('Y-m-d'),
            ]);

        return Inertia::render('DonationItemCampaigns/Index', [
            'campaigns' => $campaigns,
            'canManage' => $canManage,
        ]);
    }

    public function store(Request $request)
    {
        $this->assertCanManage($request->user());

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'goal_quantity' => ['required', 'integer', 'min:0', 'max:10000000'],
            'collected_quantity' => ['required', 'integer', 'min:0', 'max:10000000'],
            'unit_label' => ['nullable', 'string', 'max:40'],
            'ends_at' => ['nullable', 'date'],
            'status' => ['required', 'in:active,closed,archived'],
        ]);

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('donation-item-campaigns.index')->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }

        DonationItemCampaign::create([
            'church_id' => $churchId,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'goal_quantity' => (int) $data['goal_quantity'],
            'collected_quantity' => (int) $data['collected_quantity'],
            'unit_label' => trim((string) ($data['unit_label'] ?? '')) !== '' ? $data['unit_label'] : 'itens',
            'ends_at' => $data['ends_at'] ?? null,
            'status' => $data['status'],
            'created_by' => $request->user()?->id,
        ]);

        return redirect()->route('donation-item-campaigns.index')->with('success', 'Doação por item criada com sucesso.');
    }

    public function update(Request $request, DonationItemCampaign $donationItemCampaign)
    {
        $this->assertCanManage($request->user());

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'goal_quantity' => ['required', 'integer', 'min:0', 'max:10000000'],
            'collected_quantity' => ['required', 'integer', 'min:0', 'max:10000000'],
            'unit_label' => ['nullable', 'string', 'max:40'],
            'ends_at' => ['nullable', 'date'],
            'status' => ['required', 'in:active,closed,archived'],
        ]);

        $donationItemCampaign->update([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'goal_quantity' => (int) $data['goal_quantity'],
            'collected_quantity' => (int) $data['collected_quantity'],
            'unit_label' => trim((string) ($data['unit_label'] ?? '')) !== '' ? $data['unit_label'] : 'itens',
            'ends_at' => $data['ends_at'] ?? null,
            'status' => $data['status'],
        ]);

        return redirect()->route('donation-item-campaigns.index')->with('success', 'Doação por item atualizada com sucesso.');
    }

    public function destroy(DonationItemCampaign $donationItemCampaign)
    {
        $this->assertCanManage(request()->user());

        $donationItemCampaign->delete();

        return redirect()->route('donation-item-campaigns.index')->with('success', 'Doação por item removida com sucesso.');
    }
}

