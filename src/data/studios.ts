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
  isVerified: boolean;
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
