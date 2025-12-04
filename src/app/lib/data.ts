import { neon } from '@neondatabase/serverless'; 

export interface AppCatalogItem {
    id: number;
    display_name: string;
    icon_url: string | null;
    apt_name: string | null;
    dnf_name: string | null;
    pacman_name: string | null;
    last_updated: string; // the db has it as a timestamp
    category: string | null;
}

export async function getAppCatalogItems(): Promise<AppCatalogItem[]> {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not defined in environment variables.");
    }
    
    const sql = neon(process.env.DATABASE_URL);
    const response = await sql`SELECT id, display_name, icon_url, apt_name, dnf_name, pacman_name, last_updated, category FROM app_catalog`;
    
    return response as AppCatalogItem[];
}
