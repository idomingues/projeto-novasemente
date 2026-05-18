<?php

namespace App\Services;

use App\Models\ChurchSolicitation;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

class CommunicationRequestAttachmentService
{
    /**
     * @return list<array{path: string, name: string, mime: string|null}>
     */
    public function storeFromRequest(Request $request, ChurchSolicitation $solicitation): array
    {
        $files = $request->file('attachment_files');
        if (! is_array($files) || $files === []) {
            return [];
        }

        $max = (int) config('communication.max_attachments', 8);
        $stored = [];
        $dir = 'communication-requests/'.$solicitation->id;

        foreach (array_slice($files, 0, $max) as $file) {
            if (! $file instanceof UploadedFile || ! $file->isValid()) {
                continue;
            }
            $path = $file->store($dir, 'public');
            if (! is_string($path) || $path === '') {
                continue;
            }
            $stored[] = [
                'path' => $path,
                'name' => $file->getClientOriginalName(),
                'mime' => $file->getClientMimeType(),
            ];
        }

        return $stored;
    }
}
