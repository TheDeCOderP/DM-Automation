export interface TwitterTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type?: string;
    scope?: string;
    error?: string;
    error_description?: string;
}

export interface TwitterErrorResponse {
    error: string;
    error_description?: string;
    detail?: string;
}

export interface TwitterMediaUploadResponse {
    media_id: number;
    media_id_string: string;
    size: number;
    expires_after_secs: number;
    image?: {
        image_type: string;
        w: number;
        h: number;
    };
    video?: {
        video_type: string;
    };
}

export interface TwitterTweetResponse {
    data: {
        id: string;
        text: string;
    };
    errors?: Array<{
        detail: string;
        title: string;
        resource_type: string;
        parameter: string;
        value: string;
        type: string;
    }>;
}

export interface TweetBody {
    text: string;
    media?: {
        media_ids: string[];
    };
}