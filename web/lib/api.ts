export type Product = {
  id: string;
  name: string;
  category: string;
  material: string;
  size: string;
  width: number;
  depth: number;
  price: number;
  image: string;
  color: string;
  description: string;
};
export type Style = {
  id: string;
  name: string;
  image: string;
  colors: string[];
  description: string;
};
export type Furniture = {
  id: string;
  product_id: string;
  x: number;
  y: number;
  rotation: number;
};
export type Opening = {
  id: string;
  type: string;
  wall: number;
  position: number;
  width: number;
};
export type Room = {
  width: number;
  length: number;
  height: number;
  shape: string;
  confirmed: boolean;
  openings: Opening[];
  furniture: Furniture[];
};
export type Version = {
  id: string;
  name: string;
  style: string;
  image: string;
  mode: string;
  rationale: string;
  created_at: string;
};
export type Project = {
  id: string;
  title: string;
  room_type: string;
  client: string;
  budget: number;
  brief: string;
  cover: string;
  original: string;
  style: string;
  status: string;
  updated_at: string;
  created_at: string;
  room: Room;
  product_ids: string[];
  versions: Version[];
};
export type Settings = {
  provider: string;
  image_model: string;
  text_model: string;
  configured: boolean;
  live_enabled: boolean;
  estimated_cost: number;
  project_limit: number;
};
export type Job = {
  id: string;
  project_id: string;
  status: string;
  progress: number;
  mode: string;
  estimated_cost: number;
  error?: string;
};
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const r = await fetch("/api" + path, {
    ...options,
    headers:
      options.body instanceof FormData
        ? options.headers
        : { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
  });
  if (!r.ok) {
    const b = await r.json().catch(() => ({}));
    throw new Error(
      typeof b.detail === "string" ? b.detail : "请求未完成，请稍后重试",
    );
  }
  return r.json();
}
export const money = (n: number) => "¥" + n.toLocaleString("zh-CN");
export function area(r: Room) {
  return +(r.width * r.length * (r.shape === "alcove" ? 0.895 : 1)).toFixed(2);
}
