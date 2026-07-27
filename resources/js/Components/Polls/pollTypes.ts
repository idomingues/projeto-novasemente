export type PollResultOption = {
    id: number;
    label: string;
    votes_count: number;
    percent: number;
};

export type PollResults = {
    total_votes: number;
    options: PollResultOption[];
};

export function voteCountLabel(count: number): string {
    return count === 1 ? '1 voto' : `${count} votos`;
}

export function percentLabel(percent: number): string {
    return `${percent}%`;
}
