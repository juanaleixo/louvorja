import type { LiturgyItem } from "@/types/Liturgy";

export interface LiturgyBinding {
  type: "day_of_week" | "date" | "thirteenth_sabbath";
  value: string;
}

export interface LiturgyLibraryItem {
  id: string;
  name: string;
  color: string;
  items: LiturgyItem[];
  binding: LiturgyBinding | null;
  updatedAt: string;
  createdAt: string;
}
