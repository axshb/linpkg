import { neon } from "@neondatabase/serverless";

export interface AppCatalogItem {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  icon_url: string | null;
  unavailable_reason: string | null;
  ubuntu: string | null;
  fedora: string | null;
  arch: string | null;
  opensuse: string | null;
  nix: string | null;
  flatpak: string | null;
  snap: string | null;
}

export async function getAppCatalogItems(): Promise<AppCatalogItem[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment variables.");
  }

  const sql = neon(process.env.DATABASE_URL);

  const response = await sql`
        SELECT
            id,
            name,
            description,
            category,
            icon_url,
            unavailable_reason,
            ubuntu,
            fedora,
            arch,
            opensuse,
            nix,
            flatpak,
            snap
        FROM packages
        ORDER BY name ASC
    `;

  return response as AppCatalogItem[];
}
