import { defineBrand } from './lib/brand-type';

export const brand = defineBrand({
  name: 'CribDoc',
  colors: { primary: '#0F766E', primaryText: '#FFFFFF', accent: '#F59E0B' },
  // Routes are declared in src/app/_layout.tsx.
  screens: [],
});
