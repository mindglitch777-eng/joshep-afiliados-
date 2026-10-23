import {Plan} from './plan';

export const MAX_SIN_CAMBIO = 3;

// Momentos de cambio visual que pone el plan (inicio/fin de cada pieza).
export const cambiosDelPlan = (plan: Plan) =>
  [...new Set(plan.piezas.flatMap((p) => [p.desde, p.hasta]).concat(0, plan.duracion))].sort((a, b) => a - b);

// Regla de ritmo: en huecos de más de 3s, agrega cortes de zoom cada ~2.5s.
export const cortesDeRitmo = (plan: Plan) => {
  const c = cambiosDelPlan(plan);
  const extra: number[] = [];
  for (let i = 0; i < c.length - 1; i++) {
    const hueco = c[i + 1] - c[i];
    if (hueco > MAX_SIN_CAMBIO) {
      const n = Math.ceil(hueco / 2.5);
      for (let k = 1; k < n; k++) extra.push(c[i] + (hueco * k) / n);
    }
  }
  return extra;
};
