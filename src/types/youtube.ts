export interface YouTubeTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type?: string;
    scope?: string;
}

export interface YouTubeErrorResponse {
    error: string;
    error_description?: string;
}

export interface YouTubeVideoResponse {
    id: string;
    snippet: {
        title: string;
        description: string;
        tags?: string[];
        categoryId: string;
    };
    status: {
        privacyStatus: string;
        publishAt?: string;
    };
}

export interface VideoUploadBody {
    snippet: {
        title: string;
        description: string;
        tags?: string[];
        categoryId: string;
    };
    status: {
        privacyStatus: 'public' | 'private' | 'unlisted';
        publishAt?: string;
        selfDeclaredMadeForKids?: boolean;
    };
}