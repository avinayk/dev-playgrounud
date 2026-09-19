// frontend/src/data/usLocations.ts

export interface StateInfo {
  code: string;
  name: string;
}

export const US_STATES: StateInfo[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

export const US_CITIES_BY_STATE: Record<string, string[]> = {
  CA: [
    'Los Angeles',
    'San Francisco',
    'San Diego',
    'San Jose',
    'Sacramento',
    'Oakland',
    'Fresno',
    'Long Beach',
    'Bakersfield',
    'Anaheim',
    'Santa Ana',
    'Riverside',
    'Stockton',
    'Irvine',
    'Chula Vista',
    'Fremont',
    'San Bernardino',
    'Modesto',
    'Oxnard',
    'Huntington Beach',
  ],
  NY: [
    'New York',
    'Brooklyn',
    'Queens',
    'Manhattan',
    'Bronx',
    'Staten Island',
    'Buffalo',
    'Rochester',
    'Yonkers',
    'Syracuse',
    'Albany',
    'New Rochelle',
    'Mount Vernon',
    'Schenectady',
    'Utica',
    'White Plains',
    'Hempstead',
    'Troy',
    'Niagara Falls',
    'Binghamton',
  ],
  TX: [
    'Houston',
    'San Antonio',
    'Dallas',
    'Austin',
    'Fort Worth',
    'El Paso',
    'Arlington',
    'Corpus Christi',
    'Plano',
    'Lubbock',
    'Laredo',
    'Irving',
    'Garland',
    'Frisco',
    'McKinney',
    'Amarillo',
    'Grand Prairie',
    'Brownsville',
    'Killeen',
    'Pasadena',
  ],
  FL: [
    'Miami',
    'Orlando',
    'Tampa',
    'Jacksonville',
    'St. Petersburg',
    'Hialeah',
    'Port St. Lucie',
    'Cape Coral',
    'Fort Lauderdale',
    'Tallahassee',
    'Pembroke Pines',
    'Hollywood',
    'Gainesville',
    'Miramar',
    'Coral Springs',
    'Clearwater',
    'Palm Bay',
    'Pompano Beach',
    'West Palm Beach',
    'Lakeland',
  ],
};

export function getCitiesForState(stateCode: string): string[] {
  if (!stateCode) return US_CITIES_BY_STATE['CA'];
  const codeUpper = stateCode.trim().toUpperCase();
  if (US_CITIES_BY_STATE[codeUpper]) {
    return US_CITIES_BY_STATE[codeUpper];
  }
  return ['Central / Main City', 'Metropolitan Hub', 'County Hub'];
}

export function getStateName(stateCode: string): string {
  if (!stateCode) return 'California';
  const codeUpper = stateCode.trim().toUpperCase();
  const found = US_STATES.find(
    (s) => s.code === codeUpper || s.name.toLowerCase() === stateCode.toLowerCase()
  );
  return found ? found.name : stateCode;
}