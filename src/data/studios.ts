// Type partagé pour les studios. Aucune donnée factice : tout vient de la base.
export type StudioRoom = {
  id: string;
  studioId: string;
  name: string;
  pricePerHour: number;
  minBookingHours: number;
  maxBookingHours: number;
  isActive: boolean;
  position: number;
};

export type StudioStatus =
  | "non_revendique"
  | "revendication_en_attente"
  | "revendique_verifie";

export type Studio = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  address: string | null;
  image: string | null;
  gallery: string[];
  pricePerHour: number;
  genres: string[];
  equipment: string[];
  engineers: string[];
  tagline: string | null;
  description: string | null;
  capacity: number;
  ownerId: string;
  status: StudioStatus;
  isPaused: boolean;
  minBookingHours: number;
  maxBookingHours: number;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  snapchatUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  rooms: StudioRoom[];
};

export const isStudioVerified = (s: Pick<Studio, "status">) =>
  s.status === "revendique_verifie";

