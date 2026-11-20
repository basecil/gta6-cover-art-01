// The eight CC-licensed night photos that ship with Midnight Vice, with the
// face rectangle the hero poster frames on (fractions of the photo's width and
// height, from the YuNet face detector at build time). Attribution is in the
// README; nothing here is fetched at runtime -- these load from ./assets/.
export const SAMPLES = [
  { name: 'hero', file: 'hero.jpg', title: 'Portrait Chubby Jackson, Esquire Club', creator: 'libraryofcongress', license: 'cc0', face: { x: 0.3856, y: 0.2763, w: 0.2417, h: 0.2656 } },
  { name: 'street', file: 'street.jpg', title: 'Neon Street', creator: 'Ethan Brooke', license: 'cc0', face: null },
  { name: 'neon', file: 'neon.jpg', title: 'Free neon signs night Tokyo', creator: '', license: 'cc0', face: null },
  { name: 'beach', file: 'beach.jpg', title: 'Galaxy, starry beach night, rocks', creator: '', license: 'cc0', face: null },
  { name: 'car', file: 'car.jpg', title: 'Car neon night city cyberpunk gliwice poland vehicle citroen', creator: 'ijl92', license: 'cc0', face: null },
  { name: 'palm', file: 'palm.jpg', title: 'Palm tree at night', creator: 'slobtsov', license: 'cc0', face: null },
  { name: 'skyline', file: 'skyline.jpg', title: '1 singapore f1 night race 2012 city skyline', creator: 'chensiyuan', license: 'by-sa', face: null },
  { name: 'motel', file: 'motel.jpg', title: 'Vintage motel neon sign preserved', creator: 'Carol M Highsmith', license: 'cc0', face: null },
];
