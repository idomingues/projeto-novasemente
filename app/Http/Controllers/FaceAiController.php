<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\UserFaceIdentity;
use App\Support\StorageUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class FaceAiController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $identity = UserFaceIdentity::query()
            ->where('user_id', $user->id)
            ->first();

        return Inertia::render('FaceAi/Index', [
            'identity' => $identity === null ? null : [
                'id' => $identity->id,
                'reference_photo_url' => StorageUrl::publicMediaUrl($identity->reference_photo_path),
                'embedding_dim' => $identity->embedding_dim,
                'model_version' => $identity->model_version,
                'liveness_passed_at' => $identity->liveness_passed_at?->toIso8601String(),
                'updated_at' => $identity->updated_at?->toIso8601String(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $validated = $request->validate([
            'photo' => ['required', 'image', 'max:5120'],
            'embedding_json' => ['required', 'string', 'max:20000'],
            'model_version' => ['required', 'string', 'max:64'],
            'liveness_passed' => ['required', 'accepted'],
        ]);

        /** @var mixed $decoded */
        $decoded = json_decode($validated['embedding_json'], true);
        if (! is_array($decoded) || count($decoded) < 64 || count($decoded) > 1024) {
            throw ValidationException::withMessages([
                'embedding_json' => 'A matriz facial é inválida. Tente novamente.',
            ]);
        }

        $embedding = [];
        foreach ($decoded as $value) {
            if (! is_numeric($value)) {
                throw ValidationException::withMessages([
                    'embedding_json' => 'A matriz facial é inválida. Tente novamente.',
                ]);
            }
            $embedding[] = (float) $value;
        }
        $dim = count($embedding);

        $churchId = $this->currentChurchId();
        $relativeDir = 'face-id/'.($churchId ?? '0');
        $filename = $user->id.'.jpg';

        $existing = UserFaceIdentity::query()->where('user_id', $user->id)->first();
        if ($existing !== null && $existing->reference_photo_path !== '' && Storage::disk('public')->exists($existing->reference_photo_path)) {
            Storage::disk('public')->delete($existing->reference_photo_path);
        }

        $stored = $request->file('photo')->storeAs($relativeDir, $filename, 'public');

        $identity = UserFaceIdentity::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'church_id' => $churchId,
                'reference_photo_path' => $stored,
                'embedding' => $embedding,
                'embedding_dim' => $dim,
                'model_version' => $validated['model_version'],
                'liveness_passed_at' => now(),
            ],
        );

        $message = 'Rosto cadastrado com sucesso. A identificação está pronta para testes.';
        $request->session()->flash('success', $message);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
                'identity' => [
                    'id' => $identity->id,
                    'reference_photo_url' => StorageUrl::publicMediaUrl($identity->reference_photo_path),
                    'embedding_dim' => $identity->embedding_dim,
                    'model_version' => $identity->model_version,
                    'liveness_passed_at' => $identity->liveness_passed_at?->toIso8601String(),
                    'updated_at' => $identity->updated_at?->toIso8601String(),
                ],
            ]);
        }

        return redirect()
            ->route('face-ai.index')
            ->with('success', $message);
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $identity = UserFaceIdentity::query()->where('user_id', $user->id)->first();
        if ($identity === null) {
            return redirect()->route('face-ai.index');
        }

        if ($identity->reference_photo_path !== '' && Storage::disk('public')->exists($identity->reference_photo_path)) {
            Storage::disk('public')->delete($identity->reference_photo_path);
        }

        $identity->delete();

        return redirect()
            ->route('face-ai.index')
            ->with('success', 'Cadastro facial removido.');
    }
}
