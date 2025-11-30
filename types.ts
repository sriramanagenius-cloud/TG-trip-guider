
export enum TransportType {
  CAR = 'Car',
  TRAIN = 'Train',
  FLIGHT = 'Flight',
  BUS = 'Bus'
}

export enum BudgetLevel {
  LOW = 'Low Cost',
  MEDIUM = 'Medium',
  HIGH = 'Luxury'
}

export enum AppStep {
  AUTH = 'AUTH',
  ADMIN = 'ADMIN',
  LANDING = 'LANDING',
  INPUTS = 'INPUTS',
  ANALYZING = 'ANALYZING',
  POINT_CHECK = 'POINT_CHECK',
  AD_WATCH = 'AD_WATCH', 
  DURATION_SELECTION = 'DURATION_SELECTION',
  TRANSPORT = 'TRANSPORT',
  BUDGET = 'BUDGET',
  LOADING = 'LOADING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}

export interface User {
  id: string; 
  password?: string;
  points: number;
  isAdmin?: boolean;
}

export interface AdContent {
  type: 'image' | 'video';
  dataUrl: string;
  name: string;
}

export interface TripFormData {
  origin: string;
  destination: string;
  transport: TransportType;
  days: number;
  travelers: number;
  budget?: BudgetLevel;
}

export interface TripAnalysis {
  validTransports: TransportType[];
  minDays: number;
  maxDays: number;
  isInternational: boolean;
  correctedOrigin: string;
  correctedDestination: string;
  reasoning: string;
}

export interface Accommodation {
  name: string;
  description: string;
  estimatedCost: string;
}

export interface Activity {
  time: string;
  location: string;
  description: string;
}

export interface DayItinerary {
  day: number;
  activities: Activity[];
}

export interface FoodRecommendation {
  dishName: string;
  restaurantName: string;
  description: string;
}

export interface TransportDetails {
  mode: string;
  costBreakdown: string; 
  totalCost: string;
  notes: string;
}

export interface TripPlanResponse {
  destinationName: string;
  currencySymbol: string;
  grandTotal: string; // New field for the comprehensive total budget
  localTransportTip: string;
  accommodations: Accommodation[];
  itinerary: DayItinerary[];
  food: FoodRecommendation[];
  transportDetails: TransportDetails;
}
