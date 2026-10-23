// Niveles relativos a la voz (referencia ≈ -16 LUFS antes del master a -14).
// Medidos con ffmpeg ebur128 sobre cada archivo; ajustar de oído.
const db = (x: number) => Math.pow(10, x / 20);
export const NIVEL = {
  musicaConVoz: db(-17.5), // ≈ -40 LUFS → 24 dB bajo la voz
  musicaSinVoz: db(-11.5), // ducking: sube 6 dB cuando no hay voz
  impact: db(-11.6), // SFX ≈ 15 dB bajo la voz
  pop: db(-12.1),
  tick: db(-7.6),
  whoosh: db(-9.2),
};
