/**
 * Clasificación de equipos según la nomenclatura universitaria:
 * Pabellones disponibles permitidos: A, E, G, H.
 * Ejemplos:
 *   VH102-01 -> Pabellón "H", Laboratorio "VH102", Equipo "01"
 *   VA108-05 -> Pabellón "A", Laboratorio "VA108", Equipo "05"
 *   VE201-15 -> Pabellón "E", Laboratorio "VE201", Equipo "15"
 *   VG104-20 -> Pabellón "G", Laboratorio "VG104", Equipo "20"
 * Cualquier otro host que no pertenezca a A, E, G o H pasa a "Sin asignar".
 */

const ALLOWED_PAVILIONS = ['A', 'E', 'G', 'H'];

export function parseAcademicLocation(hostname) {
  if (!hostname) {
    return {
      pavilion: 'Sin asignar',
      pavilionLabel: 'Sin asignar',
      laboratory: 'Sin asignar',
      laboratoryLabel: 'Sin asignar',
      station: '-'
    };
  }

  const clean = hostname.trim().toUpperCase();

  // Patrón universitario estándar: V + [Letra Pabellón] + [Número Aula] + '-' + [Número de Equipo]
  // Ejemplos: VH101-01, VA108-05, VE201-12, VG104-25
  const standardMatch = clean.match(/^V([A-Z])(\d+)(?:-(\w+))?$/);
  if (standardMatch) {
    const pavilionLetter = standardMatch[1];
    if (ALLOWED_PAVILIONS.includes(pavilionLetter)) {
      const roomNumber = standardMatch[2];
      const labCode = `V${pavilionLetter}${roomNumber}`;
      const station = standardMatch[3] || '01';

      return {
        pavilion: pavilionLetter,
        pavilionLabel: `Pabellón ${pavilionLetter}`,
        laboratory: labCode,
        laboratoryLabel: `Laboratorio ${labCode}`,
        station: station
      };
    }
  }

  // Patrón alternativo directo: [Letra Pabellón] + [Número Aula] + '-' + [Número de Equipo]
  const altMatch = clean.match(/^([A-Z])(\d{2,4})(?:-(\w+))?$/);
  if (altMatch) {
    const pavilionLetter = altMatch[1];
    if (ALLOWED_PAVILIONS.includes(pavilionLetter)) {
      const labCode = `${pavilionLetter}${altMatch[2]}`;
      return {
        pavilion: pavilionLetter,
        pavilionLabel: `Pabellón ${pavilionLetter}`,
        laboratory: labCode,
        laboratoryLabel: `Laboratorio ${labCode}`,
        station: altMatch[3] || '01'
      };
    }
  }

  // Cualquier otro host pasa a "Sin asignar"
  return {
    pavilion: 'Sin asignar',
    pavilionLabel: 'Sin asignar',
    laboratory: 'Sin asignar',
    laboratoryLabel: 'Sin asignar',
    station: clean
  };
}
