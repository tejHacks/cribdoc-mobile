import { defineBrand } from './lib/brand-type';

export const brand = defineBrand({
  name: 'CribDoc',
  colors: { primary: '#0F766E', primaryText: '#FFFFFF', accent: '#F59E0B' },
  screens: [
    { name: 'index', title: 'CribDoc' },
    { name: 'screen', title: 'Screening' },
    { name: 'learn', title: 'Danger signs' },
  ],
});
