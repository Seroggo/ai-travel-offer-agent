export type BudgetMode = "hard" | "soft" | "unknown";

export type SpikeRequest = {
  departure_id?: number | null;
  country_id: number;
  date_from: string;
  date_to: string;
  nights_from: number;
  nights_to: number;
  adults: number;
  children_ages: number[];
  budget_max: number | null;
  budget_mode: BudgetMode;
  meal: string | null;
  meal_id?: number | null;
  hotel_category_min: number | null;
  hotel_rating_min: number | null;
};

export type SpikeTour = {
  hotel_id: number;
  hotel_name: string;
  country_id: number;
  country: string;
  resort: string;
  hotel_category: number;
  hotel_rating: number;
  distance_to_sea: number;
  tour_id: string;
  departure_date: string;
  nights: number;
  meal: string;
  room: string;
  tour_operator: string;
  price: number;
  currency: string;
  hotel_availability: string;
  flight_availability: string;
};

export type SpikePipelineResult = {
  ranked_tours: SpikeTour[];
  warnings: string[];
};
