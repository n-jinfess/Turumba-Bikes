// Optional location gates. Facebook's own search radius is loose and returns
// far-away results; a gate tightens a digest to a real metro. Add your own.
export const areas = {
  // Washington DC / Northern Virginia / close Maryland suburbs.
  dmv: {
    nearStates: ['Virginia', 'Washington D\\.?C\\.?', 'Maryland', 'D\\.?C\\.?'],
    farCities: [
      'Richmond', 'Woodstock', 'Harrisonburg', 'Baltimore', 'Conowingo',
      'Ocean City', 'Winchester', 'Charlottesville', 'Stevensville',
      'Ellicott City', 'New Market', 'Urbana', 'Fort Detrick', 'Frederick',
      'Glen Burnie', 'Severna Park',
    ],
  },
};

/** Look up an area preset by the first token of a city string, best-effort. */
export function areaFor(location = '') {
  if (/\b(mclean|arlington|vienna|falls church|fairfax|dc|washington|bethesda|alexandria|tysons)\b/i.test(location)) {
    return areas.dmv;
  }
  return undefined;
}
