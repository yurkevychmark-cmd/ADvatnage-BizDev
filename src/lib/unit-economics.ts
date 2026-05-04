export interface EconInputs {
  planned_spend: number;
  expected_conversions: number;
  avg_revenue_per_user: number;
  cpa_payout: number;
  revshare_pct: number;
}

export interface EconResults {
  effective_cpa: number;
  ltv: number;
  gross_revenue: number;
  roi: number;
  profit: number;
  breakeven_conversions: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateEconomics(input: EconInputs): EconResults {
  const { planned_spend, expected_conversions, avg_revenue_per_user, cpa_payout, revshare_pct } = input;

  const effective_cpa = expected_conversions > 0 ? planned_spend / expected_conversions : 0;
  const ltv = avg_revenue_per_user;

  const revenue_per_conv = cpa_payout + (avg_revenue_per_user * revshare_pct / 100);
  const gross_revenue = expected_conversions * revenue_per_conv;

  const profit = gross_revenue - planned_spend;
  const roi = planned_spend > 0 ? (profit / planned_spend) * 100 : 0;

  const breakeven_conversions = revenue_per_conv > 0
    ? Math.ceil(planned_spend / revenue_per_conv)
    : 0;

  return {
    effective_cpa: round2(effective_cpa),
    ltv: round2(ltv),
    gross_revenue: round2(gross_revenue),
    roi: round2(roi),
    profit: round2(profit),
    breakeven_conversions: breakeven_conversions,
  };
}
