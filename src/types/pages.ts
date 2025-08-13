import { Platform } from "@prisma/client";

export interface Pages {
    id: string
    name: string
    access_token: string
    platfrom: Platform
}