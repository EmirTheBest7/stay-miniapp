import type { CityId } from './types';

// District centres (approximate, degrees). A new listing's PUBLIC pin is the district centre (the server snaps + jitters it to a ~400 m grid anyway);
// the exact address is a separate private text field that never leaves the server.
export const DISTRICT_POS: Record<CityId, Record<string, [number, number]>> = {
  prague: {
    Vinohrady: [50.0755, 14.4510], Karlín: [50.0925, 14.4500], Žižkov: [50.0845, 14.4560], Smíchov: [50.0700, 14.4040], Holešovice: [50.1000, 14.4350],
    Letná: [50.0970, 14.4220], Vršovice: [50.0680, 14.4560], Dejvice: [50.1020, 14.3930], Nusle: [50.0590, 14.4380], Libeň: [50.1060, 14.4700],
    Břevnov: [50.0850, 14.3590], Pankrác: [50.0510, 14.4390],
  },
  brno: { 'Brno-střed': [49.1951, 16.6068], 'Královo Pole': [49.2290, 16.5940], Žabovřesky: [49.2120, 16.5740], Líšeň: [49.2040, 16.6860], Husovice: [49.2140, 16.6150] },
  ostrava: { 'Moravská Ostrava': [49.8350, 18.2820], Poruba: [49.8300, 18.1650], Zábřeh: [49.7880, 18.2650], 'Mariánské Hory': [49.8230, 18.2400] },
};
