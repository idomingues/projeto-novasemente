import { feedCaptionParagraphs } from '@/utils/feedCaption';

interface Props {
    caption: string;
    className?: string;
    /** Na lista do feed: limita altura (line-clamp) */
    clampLines?: boolean;
}

export default function FeedCaptionBody({ caption, className = '', clampLines = false }: Props) {
    const paragraphs = feedCaptionParagraphs(caption);

    if (paragraphs.length === 0) {
        return null;
    }

    return (
        <div
            className={`space-y-3 break-words text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 ${
                clampLines ? 'line-clamp-6' : ''
            } ${className}`}
        >
            {paragraphs.map((block, index) => (
                <p key={index} className="whitespace-pre-wrap">
                    {block}
                </p>
            ))}
        </div>
    );
}
