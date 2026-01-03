export type ProjectMeta = {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  access_type: "owned" | "collaborated";
  thumbnail_url?: string | null;
  layers_data?: { layers: any[] } | null;
  thumbnail_config?: any | null;
};
