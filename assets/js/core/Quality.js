/**
 * Picks a rendering budget for the current device. Everything that costs GPU/CPU
 * (pixel ratio, shadow map, particle counts, hair strands) reads from here.
 */
export function detectQuality() {
    const w = window.innerWidth;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let tier = 'high';
    if (coarse || w < 1000 || cores <= 4) tier = 'mid';
    if ((coarse && w < 640) || (memory <= 2) || (coarse && cores <= 4)) tier = 'low';

    const table = {
        high: { maxDpr: 1.75, shadow: 2048, dust: 700, hairDensity: 1 / 110, hairMax: 11000, antialias: true },
        mid: { maxDpr: 1.5, shadow: 1024, dust: 380, hairDensity: 1 / 140, hairMax: 6500, antialias: true },
        low: { maxDpr: 1.25, shadow: 512, dust: 180, hairDensity: 1 / 180, hairMax: 3200, antialias: false },
    };

    return {
        tier,
        coarse,
        reducedMotion,
        ...table[tier],
        dpr: Math.min(window.devicePixelRatio || 1, table[tier].maxDpr),
    };
}
