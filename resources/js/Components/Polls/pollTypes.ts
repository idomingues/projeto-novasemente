export type PollVoter = {
    user_id: number | null;
    name: string;
    photo_url: string | null;
    is_you: boolean;
    voted_at: string | null;
    voted_at_label: string;
};

export type PollResultOption = {
    id: number;
    label: string;
    votes_count: number;
    percent: number;
    voters?: PollVoter[];
};

export type PollResults = {
    total_votes: number;
    options: PollResultOption[];
};

export function voteCountLabel(count: number): string {
    return count === 1 ? '1 voto' : `${count} votos`;
}
