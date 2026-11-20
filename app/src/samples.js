// The nine CC-licensed night photos that ship with Midnight Vice, with the
// face rectangle the hero poster frames on (fractions of the photo's width and
// height, from the YuNet face detector at build time). Each sample also carries
// the role tag printed on its panel, so a tag always names the face it sits on.
// Attribution is in the README; nothing here is fetched at runtime -- these
// load from ./assets/.
export const SAMPLES = [
  { name: 'hero', file: 'hero.jpg', title: 'Woman Nightlife', creator: 'Matt Moloney', license: 'cc0', role: 'LUCIA', face: { x: 0.4010, y: 0.2373, w: 0.2715, h: 0.2576 } },
  { name: 'glow', file: 'glow.jpg', title: 'Woman Neon', creator: 'Teddy Tavan', license: 'cc0', role: 'NEON ALLEY', face: null },
  { name: 'street', file: 'street.jpg', title: 'Neon Street', creator: 'Ethan Brooke', license: 'cc0', role: 'OCEAN DRIVE', face: null },
  { name: 'neon', file: 'neon.jpg', title: 'Free neon signs night Tokyo', creator: '', license: 'cc0', role: 'SIGN DISTRICT', face: null },
  { name: 'beach', file: 'beach.jpg', title: 'Galaxy, starry beach night, rocks', creator: '', license: 'cc0', role: 'THE COAST', face: null },
  { name: 'car', file: 'car.jpg', title: 'Car neon night city cyberpunk gliwice poland vehicle citroen', creator: 'ijl92', license: 'cc0', role: 'THE GETAWAY', face: null },
  { name: 'palm', file: 'palm.jpg', title: 'Palm tree at night', creator: 'slobtsov', license: 'cc0', role: 'PALM NIGHTS', face: null },
  { name: 'skyline', file: 'skyline.jpg', title: '1 singapore f1 night race 2012 city skyline', creator: 'chensiyuan', license: 'by-sa', role: 'THE CITY', face: null },
  { name: 'motel', file: 'motel.jpg', title: 'Vintage motel neon sign preserved', creator: 'Carol M Highsmith', license: 'cc0', role: 'LAST EXIT', face: null },
];
