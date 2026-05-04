import type { Buyer, Operator } from './types';

export interface MatchResult {
  buyer_id: string;
  operator_id: string;
  score: number;
  geo_overlap: string[];
  traffic_overlap: string[];
  budget_fit: boolean;
}

const W_GEO = 0.45;
const W_TRAFFIC = 0.30;
const W_BUDGET = 0.25;

export function computeMatches(buyers: Buyer[], operators: Operator[]): MatchResult[] {
  const results: MatchResult[] = [];

  for (const buyer of buyers) {
    for (const operator of operators) {
      const geoOverlap = buyer.geo_expertise.filter(g => operator.target_geos.includes(g));
      const geoUnion = new Set([...buyer.geo_expertise, ...operator.target_geos]).size;
      const geoScore = geoUnion > 0 ? (geoOverlap.length / geoUnion) * 100 : 0;

      const trafficOverlap = buyer.traffic_types.filter(t => operator.preferred_traffic.includes(t));
      const trafficUnion = new Set([...buyer.traffic_types, ...operator.preferred_traffic]).size;
      const trafficScore = trafficUnion > 0 ? (trafficOverlap.length / trafficUnion) * 100 : 0;

      const budgetFit = buyer.monthly_budget_capacity >= operator.budget_min
                     && buyer.monthly_budget_capacity <= operator.budget_max * 1.5;
      const budgetScore = budgetFit ? 100 : 0;

      const totalScore = Math.round(
        geoScore * W_GEO + trafficScore * W_TRAFFIC + budgetScore * W_BUDGET
      );

      if (totalScore > 0) {
        results.push({
          buyer_id: buyer.id,
          operator_id: operator.id,
          score: totalScore,
          geo_overlap: geoOverlap,
          traffic_overlap: trafficOverlap,
          budget_fit: budgetFit,
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
