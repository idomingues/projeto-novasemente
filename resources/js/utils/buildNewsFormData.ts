export type NewsFormData = {
    content_type: string;
    title: string;
    excerpt: string;
    body: string;
    youtube_url: string;
    instagram_url: string;
    image_url: string;
    published_at: string;
    image_file: File | null;
    video_file: File | null;
    pdf_file: File | null;
};

export function buildNewsFormData(data: NewsFormData): FormData {
    const formData = new FormData();
    formData.append('content_type', data.content_type);
    formData.append('title', data.title);
    formData.append('excerpt', data.excerpt);
    formData.append('body', data.body);
    formData.append('youtube_url', data.youtube_url);
    formData.append('instagram_url', data.instagram_url);
    formData.append('image_url', data.image_url);
    if (data.published_at.trim() !== '') {
        formData.append('published_at', data.published_at);
    }
    if (data.image_file) {
        formData.append('image_file', data.image_file);
    }
    if (data.video_file) {
        formData.append('video_file', data.video_file);
    }
    if (data.pdf_file) {
        formData.append('pdf_file', data.pdf_file);
    }

    return formData;
}
