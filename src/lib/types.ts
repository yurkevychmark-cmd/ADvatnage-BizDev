export interface Buyer {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_telegram: string | null;
  geo_expertise: string[];
  traffic_types: string[];
  monthly_budget_capacity: number;
  rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Operator {
  id: string;
  name: string;
  brand: string | null;
  target_geos: string[];
  budget_min: number;
  budget_max: number;
  preferred_traffic: string[];
  deal_type: 'CPA' | 'RevShare' | 'Hybrid';
  cpa_value: number | null;
  revshare_pct: number | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  buyer_id: string;
  operator_id: string;
  score: number;
  geo_overlap: string[];
  traffic_overlap: string[];
  budget_fit: boolean;
  status: 'suggested' | 'accepted' | 'rejected' | 'active';
  pipeline_stage: 'new' | 'negotiation' | 'trial' | 'active' | 'completed';
  created_at: string;
  buyer?: Buyer;
  operator?: Operator;
}

export interface MatchComment {
  id: string;
  match_id: string;
  author: string;
  body: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  match_id: string | null;
  buyer_id: string | null;
  operator_id: string | null;
  planned_spend: number;
  expected_conversions: number;
  avg_revenue_per_user: number;
  cpa_payout: number;
  revshare_pct: number;
  calc_cpa: number | null;
  calc_ltv: number | null;
  calc_roi: number | null;
  calc_breakeven: number | null;
  actual_spend: number | null;
  actual_conversions: number | null;
  actual_revenue: number | null;
  notes: string | null;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  buyer?: Buyer;
  operator?: Operator;
}
