import {expect, test} from 'bun:test';
import {BODIES, elementSetFor, orbitPathAu, positionAu, velocityKmS, type Body} from './ephemeris';
import {norm} from './vec';

// Reference vectors: JPL Horizons (https://ssd.jpl.nasa.gov/api/horizons.api), heliocentric (500@10),
// ecliptic plane of the ICRF frame, AU, at 00:00 TDB on the date. The EM barycentre is Horizons body 3.
// Fixed values, so the suite never touches the network.
type Ref = readonly [Body, string, number, number, number];
const REFERENCE: readonly Ref[] = [
  ['mercury', '1900-01-01', -0.3873786086579065, -0.1626546484088456, 0.02239016479422692],
  ['mercury', '1950-06-15', 0.3349574467452462, -0.209628624844654, -0.04789711253461233],
  ['mercury', '2000-01-01', -0.1407280797108344, -0.4439009580270337, -0.02334555919971206],
  ['mercury', '2025-03-01', 0.1787139162013782, 0.2551275068208775, 0.004457571876405659],
  ['mercury', '2049-12-31', -0.1497259123215184, 0.2811975422495228, 0.03671237230749335],
  ['mercury', '2075-07-04', 0.1364603866475746, 0.2770369806201404, 0.01015977471704942],
  ['mercury', '2100-01-01', 0.2387416045804995, -0.3565573467721776, -0.05102537864026348],
  ['venus', '1900-01-01', 0.6998542285711752, -0.1936805114475438, -0.04304705980257389],
  ['venus', '1950-06-15', 0.7073345351872613, -0.1637349317114458, -0.04307047747398993],
  ['venus', '2000-01-01', -0.7186302169204941, -0.02250380069428597, 0.0411718412863683],
  ['venus', '2025-03-01', -0.5985070654249736, 0.3957274034205443, 0.03996879465666835],
  ['venus', '2049-12-31', 0.1220282518549807, -0.7169826496717301, -0.01693593854765935],
  ['venus', '2075-07-04', 0.0733084522193172, 0.7162702405342857, 0.005712482478004343],
  ['venus', '2100-01-01', 0.6875297939410026, 0.2278299451942747, -0.03645142369161136],
  ['earthMoonBarycenter', '1900-01-01', -0.1968855472576664, 0.963322504694548, 0.0002145142891964996],
  ['earthMoonBarycenter', '1950-06-15', -0.1056510994236714, -1.010299749717477, -0.0001156840161170283],
  ['earthMoonBarycenter', '2000-01-01', -0.1685504484594163, 0.9687636587587728, -1.151366377347781e-06],
  ['earthMoonBarycenter', '2025-03-01', -0.9328204326211686, 0.3339809885371745, -1.366725784128788e-05],
  ['earthMoonBarycenter', '2049-12-31', -0.1543372806068109, 0.9711846361455682, -0.0001086568376056762],
  ['earthMoonBarycenter', '2075-07-04', 0.1968784303982909, -0.9974340932066351, 0.0001688766880898843],
  ['earthMoonBarycenter', '2100-01-01', -0.1574347093273749, 0.9706900209623327, -0.0002176447797994902],
  ['mars', '1900-01-01', 0.4353672637661962, -1.352511632053388, -0.03907972599748535],
  ['mars', '1950-06-15', -1.171920911490295, -1.045246962890197, 0.007049213979004791],
  ['mars', '2000-01-01', 1.390361066039004, -0.02100972225898463, -0.03461801440927048],
  ['mars', '2025-03-01', -1.181717550370159, 1.157722184596155, 0.05324030426938123],
  ['mars', '2049-12-31', -1.548040102325055, -0.491467206221096, 0.02757372671207549],
  ['mars', '2075-07-04', 0.8015661131729052, 1.254364470713408, 0.006742035940608267],
  ['mars', '2100-01-01', 0.6096557738716314, 1.380752260077868, 0.0141235799351885],
  ['jupiter', '1900-01-01', -3.016039428434643, -4.460192848212442, 0.08580446724963403],
  ['jupiter', '1950-06-15', 4.199796344144086, -2.757288485804918, -0.08278791034892653],
  ['jupiter', '2000-01-01', 4.003460488693537, 2.935353187887882, -0.1018230443988181],
  ['jupiter', '2025-03-01', 0.6113973727179709, 5.065416293852624, -0.03472045049323118],
  ['jupiter', '2049-12-31', -2.384226138725157, 4.667165514648183, 0.03380017533021545],
  ['jupiter', '2075-07-04', -5.31296754424235, 1.10611062865191, 0.114066819535839],
  ['jupiter', '2100-01-01', -5.373760304528921, -0.9084799102285207, 0.1238877644450175],
  ['saturn', '1900-01-01', -0.3669668301916346, -10.05835162253679, 0.1915839287938125],
  ['saturn', '1950-06-15', -9.257598445704085, 1.601301950748508, 0.33969500852927],
  ['saturn', '2000-01-01', 6.408556035505925, 6.568042752621957, -0.3691272880681217],
  ['saturn', '2025-03-01', 9.497425773141616, -1.440604033670734, -0.3529660644208627],
  ['saturn', '2049-12-31', 4.761631551238973, -8.776366839255, -0.03764841938727385],
  ['saturn', '2075-07-04', -2.592390568760148, -9.693567077332444, 0.2709082059752169],
  ['saturn', '2100-01-01', -9.153087247698588, -3.078992753104979, 0.4182399691810392],
  ['uranus', '1900-01-01', -6.479284811082752, -17.85343203465369, 0.01776413785456968],
  ['uranus', '1950-06-15', -1.892408846134727, 18.82114213453439, 0.09461368380999702],
  ['uranus', '2000-01-01', 14.43051609648136, -13.73565967460644, -0.2381293855338772],
  ['uranus', '2025-03-01', 10.90971178272052, 16.21450581238463, -0.08123948494380605],
  ['uranus', '2049-12-31', -17.82232669789451, 4.075476801601421, 0.2458532763908095],
  ['uranus', '2075-07-04', 4.017549373368718, -19.05650233690901, -0.1225124812098269],
  ['uranus', '2100-01-01', 18.86505817234219, 6.548936230922684, -0.2196576362155045],
  ['neptune', '1900-01-01', 1.514870538411453, 29.82557424288678, -0.6491144446440917],
  ['neptune', '1950-06-15', -28.94693706474923, -8.901505131190566, 0.8501809578029305],
  ['neptune', '2000-01-01', 16.81075807703606, -24.99265146883861, 0.1272705680239183],
  ['neptune', '2025-03-01', 29.88166437398121, -0.4477186105990053, -0.6793785880146684],
  ['neptune', '2049-12-31', 17.40077687092198, 24.19593275526163, -0.8992628137678956],
  ['neptune', '2075-07-04', -10.61184880081325, 28.02268819632767, -0.3325140427235705],
  ['neptune', '2100-01-01', -29.05922741901618, 8.235187480545719, 0.5001933984409804],
];

// The brief's "within a fraction of a degree", made exact: asserted directly.
const MAX_LON_DEG = 0.25;
const MAX_DIST_FRACTION = 0.005;

const lonDegBetween = (a: readonly number[], b: readonly number[]): number => {
  let d = Math.atan2(a[1]!, a[0]!) - Math.atan2(b[1]!, b[0]!);
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return Math.abs(d) * (180 / Math.PI);
};

test('every body matches the JPL reference within 0.25 degrees and 0.5 percent across 1900-2100', () => {
  expect(new Set(REFERENCE.map((r) => r[0])).size).toBe(BODIES.length);
  for (const [body, day, x, y, z] of REFERENCE) {
    const got = positionAu(body, new Date(day + 'T00:00:00Z'));
    const ref = Math.hypot(x, y, z);
    expect({body, day, ok: lonDegBetween(got, [x, y, z]) <= MAX_LON_DEG}).toEqual({body, day, ok: true});
    expect({body, day, ok: Math.abs(norm(got) - ref) / ref <= MAX_DIST_FRACTION}).toEqual({body, day, ok: true});
  }
});

test('the element set switches at the edges of the Table 1 range', () => {
  expect(elementSetFor(new Date('1799-12-31T00:00:00Z'))).toBe('table2');
  expect(elementSetFor(new Date('1800-01-02T00:00:00Z'))).toBe('table1');
  expect(elementSetFor(new Date('2049-12-31T00:00:00Z'))).toBe('table1');
  expect(elementSetFor(new Date('2050-01-02T00:00:00Z'))).toBe('table2');
});

test('positions stay close across the table switch', () => {
  for (const body of BODIES) {
    const a = positionAu(body, new Date('2049-12-31T00:00:00Z'));
    const b = positionAu(body, new Date('2050-01-02T00:00:00Z'));
    expect(norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]])).toBeLessThan(0.5);
  }
});

test('Earth is near perihelion in early January and near aphelion in early July', () => {
  expect(norm(positionAu('earthMoonBarycenter', new Date('2000-01-03T00:00:00Z')))).toBeLessThan(0.984);
  expect(norm(positionAu('earthMoonBarycenter', new Date('2000-07-04T00:00:00Z')))).toBeGreaterThan(1.016);
});

test('orbit paths are closed and pass through the body position', () => {
  const date = new Date('2025-03-01T00:00:00Z');
  for (const body of BODIES) {
    const path = orbitPathAu(body, date);
    const end = path[path.length - 1]!;
    path[0]!.forEach((c, i) => expect(c).toBeCloseTo(end[i]!, 9));
    const p = positionAu(body, date);
    const nearest = Math.min(...path.map((q) => norm([q[0] - p[0], q[1] - p[1], q[2] - p[2]])));
    expect(nearest).toBeLessThan(0.02 * norm(p));
  }
});

test('Earth moves about 30 km/s', () => {
  const v = norm(velocityKmS('earthMoonBarycenter', new Date('2025-03-01T00:00:00Z')));
  expect(v).toBeGreaterThan(29);
  expect(v).toBeLessThan(31);
});
