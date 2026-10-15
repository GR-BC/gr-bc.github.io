export const comparisonConfig = {
  // All visual timing and interaction accents live here. Curves live in plot.svg.
  reveal: { duration: 850, photoStagger: 85, plotDelay: 520, curveDelay: 720, curveStagger: 95, curveDuration: 1450, annotationDelay: 1740, timelineDelay: 2040 },
  colors: { ink: '#14233d', blue: '#2f6fd5', accent: '#d8a044' },
  methods: [
    { id: 'robometer', label: 'Robometer', color: '#83a382' },
    { id: 'sarm', label: 'SARM', color: '#72adc5' },
    { id: 'robo-dopamine', label: 'Robo-Dopamine', color: '#a79b93' },
    { id: 'rewind', label: 'ReWiND', color: '#dda88f' },
    { id: 'grp', label: 'GRP (Ours)', color: '#d8a044' },
  ],
  frames: [
    { id: 'detour', label: 'Detour', note: 'A deviation along the trajectory.' },
    { id: 'reorient-1', label: 'Reorient', note: 'The first annotated reorientation.' },
    { id: 'left-slip', label: 'Left slip-out', note: 'The annotated left slip-out moment.' },
    { id: 'reorient-2', label: 'Reorient', note: 'The second annotated reorientation.' },
    { id: 'right-slip', label: 'Right slip-out', note: 'The annotated right slip-out moment.' },
  ],
};
