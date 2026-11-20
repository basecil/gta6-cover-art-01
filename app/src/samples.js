// The eight sunlit sample photos that ship with Sunflare. Each is a
// golden-hour scene fetched at build time from Openverse (CC-licensed) and
// vendored under app/assets/, so the app loads them on open with no network.
// `face` is a normalised box around the hero's face, used to frame the hero
// panel; `role` is the tag printed on that panel.

export const SAMPLES = [
  {
    name: 'Sunlit Beach',
    file: 'beach.jpg',
    title: 'Fisherman at Muzhappilangad Beach',
    creator: 'Shagil Kannur',
    license: 'CC BY-SA 4.0',
    role: 'THE COAST',
    face: { x: 0.2628, y: 0.4543, w: 0.0222, h: 0.0405 },
  },
  {
    name: 'Palm Road Convertible',
    file: 'car.jpg',
    title: '1974 Dodge Charger Rallye',
    creator: 'George',
    license: 'CC BY-SA 2.0',
    role: 'THE GETAWAY',
    face: null,
  },
  {
    name: 'Golden Hero',
    file: 'hero.jpg',
    title: 'Woman Beach',
    creator: 'Matt Moloney',
    license: 'CC0 1.0',
    role: 'THE LEAD',
    face: { x: 0.3539, y: 0.105, w: 0.1724, h: 0.1841 },
  },
  {
    name: 'Sunset Pier',
    file: 'pier.jpg',
    title: 'Sunset Fishing Pier, Lake Brownwood',
    creator: 'Larry D. Moore',
    license: 'CC BY 4.0',
    role: 'THE PIER',
    face: null,
  },
  {
    name: 'Poolside',
    file: 'pool.jpg',
    title: 'Swimming Pool',
    creator: 'Michael Burridge',
    license: 'CC0 1.0',
    role: 'POOLSIDE',
    face: null,
  },
  {
    name: 'Scooter Friends',
    file: 'scooter.jpg',
    title: 'Scooter skates',
    creator: 'libraryofcongress',
    license: 'CC0 1.0',
    role: 'THE CREW',
    face: { x: 0.8124, y: 0.4887, w: 0.0296, h: 0.0473 },
  },
  {
    name: 'Skyline at Dusk',
    file: 'skyline.jpg',
    title: 'Pinelands Sunrise',
    creator: 'National Park Service',
    license: 'CC0 1.0',
    role: 'THE CITY',
    face: null,
  },
  {
    name: 'Lifeguard Tower',
    file: 'tower.jpg',
    title: 'Huntington Beach Lifeguard Tower at Sunset',
    creator: 'Jsalatas',
    license: 'CC BY-SA 4.0',
    role: 'THE TOWER',
    face: null,
  },
];
