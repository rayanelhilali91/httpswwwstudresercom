import { supabase } from "@/integrations/supabase/client";
import type { Studio, StudioRoom, StudioStatus } from "@/data/studios";

type Row = {
  id: string;
  owner_id: string;
  name: string;
  city: string | null;
  country: string | null;
  address: string | null;
  tagline: string | null;
  description: string | null;
  price_per_hour: number | null;
  capacity: number | null;
  image_url: string | null;
  gallery: unknown;
  genres: string[] | null;
  equipment: string[] | null;
  engineers?: string[] | null;
  status?: StudioStatus | null;
  is_paused?: boolean | null;
  min_booking_hours?: number | null;
  max_booking_hours?: number | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  snapchat_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type RoomRow = {
  id: string;
  studio_id: string;
  name: string;
  price_per_hour: number | null;
  min_booking_hours: number | null;
  max_booking_hours: number | null;
  is_active: boolean | null;
  position: number | null;
};

export function rowToRoom(r: RoomRow): StudioRoom {
  return {
    id: r.id,
    studioId: r.studio_id,
    name: r.name,
    pricePerHour: Number(r.price_per_hour ?? 0),
    minBookingHours: r.min_booking_hours ?? 1,
    maxBookingHours: r.max_booking_hours ?? 24,
    isActive: r.is_active !== false,
    position: r.position ?? 0,
  };
}

export function rowToStudio(r: Row, rooms: StudioRoom[] = []): Studio {
  const gallery = Array.isArray(r.gallery) ? (r.gallery as string[]) : [];
  return {
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    city: r.city,
    country: r.country,
    address: r.address,
    tagline: r.tagline,
    description: r.description,
    pricePerHour: Number(r.price_per_hour ?? 0),
    capacity: r.capacity ?? 1,
    image: r.image_url,
    gallery,
    genres: r.genres ?? [],
    equipment: r.equipment ?? [],
    engineers: r.engineers ?? [],
    status: (r.status ?? "non_revendique") as StudioStatus,
    isPaused: !!r.is_paused,
    minBookingHours: r.min_booking_hours ?? 2,
    maxBookingHours: r.max_booking_hours ?? 12,
    instagramUrl: r.instagram_url ?? null,
    tiktokUrl: r.tiktok_url ?? null,
    snapchatUrl: r.snapchat_url ?? null,
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    rooms,
  };
}

const SELECT =
  "id, owner_id, name, city, country, address, tagline, description, price_per_hour, capacity, image_url, gallery, genres, equipment, engineers, status, is_paused, min_booking_hours, max_booking_hours, instagram_url, tiktok_url, snapchat_url, latitude, longitude";

export async function fetchPublishedStudios(): Promise<Studio[]> {
  const { data, error } = await supabase
    .from("studios")
    .select(SELECT)
    .eq("is_published", true)
    .eq("is_paused", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d) => rowToStudio(d as unknown as Row));
}

export async function fetchStudio(id: string): Promise<Studio | null> {
  const { data, error } = await supabase
    .from("studios")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: roomsData } = await supabase
    .from("studio_rooms")
    .select(
      "id, studio_id, name, price_per_hour, min_booking_hours, max_booking_hours, is_active, position",
    )
    .eq("studio_id", id)
    .eq("is_active", true)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  const rooms = (roomsData ?? []).map((r) => rowToRoom(r as RoomRow));
  return rowToStudio(data as unknown as Row, rooms);
}
