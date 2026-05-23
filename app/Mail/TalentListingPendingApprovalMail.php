<?php

namespace App\Mail;

use App\Models\TalentListing;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TalentListingPendingApprovalMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public TalentListing $listing,
        public string $authorName,
        public string $approvalUrl,
    ) {}

    public function build(): self
    {
        $this->listing->loadMissing(['category:id,name', 'church:id,name']);

        return $this->subject('Nova publicação aguardando aprovação — '.$this->listing->title)
            ->markdown('emails.talent-listing-pending-approval');
    }
}
