/**
 * Realistic Data Utilities
 *
 * Egyptian-specific data generators for realistic mock data including
 * phone numbers, addresses, company names, and tax numbers.
 */

import seedrandom from 'seedrandom';

/**
 * Egyptian phone number prefixes
 */
const PHONE_PREFIXES = ['010', '011', '012', '015'];

/**
 * Egyptian governorates
 */
const GOVERNORATES = [
  'Cairo',
  'Giza',
  'Alexandria',
  'Dakahlia',
  'Sharqia',
  'Gharbia',
  'Qalyubia',
  'Port Said',
  'Suez',
  'Ismailia',
  'Red Sea',
  'South Sinai',
  'North Sinai',
  'Aswan',
  'Luxor',
  'Qena',
  'Sohag',
  'Assiut',
  'Minya',
  'Beni Suef',
  'Fayoum',
  'Beheira',
  'Kafr El Sheikh',
  'Damietta',
  'Matrouh',
  'New Valley',
];

/**
 * Major Egyptian cities with coordinates
 */
export const EGYPTIAN_CITIES = [
  { name: 'Cairo', nameAr: 'القاهرة', lat: 30.0444, lng: 31.2357 },
  { name: 'Alexandria', nameAr: 'الإسكندرية', lat: 31.2001, lng: 29.9187 },
  { name: 'Giza', nameAr: 'الجيزة', lat: 30.0131, lng: 31.2089 },
  { name: 'Sharm El Sheikh', nameAr: 'شرم الشيخ', lat: 27.9158, lng: 34.3300 },
  { name: 'Hurghada', nameAr: 'الغردقة', lat: 27.2579, lng: 33.8116 },
  { name: 'Luxor', nameAr: 'الأقصر', lat: 25.6872, lng: 32.6396 },
  { name: 'Aswan', nameAr: 'أسوان', lat: 24.0889, lng: 32.8998 },
  { name: 'Port Said', nameAr: 'بورسعيد', lat: 31.2653, lng: 32.3019 },
  { name: 'Suez', nameAr: 'السويس', lat: 29.9668, lng: 32.5498 },
  { name: 'Mansoura', nameAr: 'المنصورة', lat: 31.0409, lng: 31.3785 },
];

/**
 * Egyptian street name patterns
 */
const STREET_NAMES = [
  'El Tahrir',
  'El Gomhoreya',
  'El Nasr',
  'El Salam',
  'El Horreya',
  'Mohamed Ali',
  'Ramses',
  'El Nil',
  'El Azhar',
  'Salah Salem',
  'Ahmed Orabi',
  'Gamal Abdel Nasser',
  'El Merghany',
  'El Thawra',
  'El Nozha',
  'El Ahram',
  'El Haram',
  'Abbas El Akkad',
  'El Moez',
  'El Galaa',
];

/**
 * Arabic first names
 */
const ARABIC_FIRST_NAMES_MALE = [
  'Ahmed', 'Mohamed', 'Mahmoud', 'Ali', 'Omar', 'Hassan', 'Ibrahim', 'Khaled',
  'Youssef', 'Mostafa', 'Karim', 'Amr', 'Tarek', 'Sherif', 'Hossam', 'Walid',
  'Ayman', 'Hany', 'Essam', 'Ashraf',
];

const ARABIC_FIRST_NAMES_FEMALE = [
  'Fatma', 'Mariam', 'Nour', 'Sara', 'Heba', 'Dina', 'Rania', 'Mona',
  'Yasmin', 'Aya', 'Amira', 'Laila', 'Noha', 'Eman', 'Salma', 'Mai',
  'Nada', 'Hala', 'Dalia', 'Ghada',
];

/**
 * Arabic last names
 */
const ARABIC_LAST_NAMES = [
  'Mohamed', 'Ahmed', 'Ali', 'Hassan', 'Ibrahim', 'Mahmoud', 'Youssef',
  'El Sayed', 'Abdel Rahman', 'Abdel Aziz', 'El Masry', 'El Sherif',
  'El Naggar', 'El Husseiny', 'Farag', 'Gamal', 'Saleh', 'Rizk',
  'El Sawy', 'El Gohary',
];

/**
 * Coffee/beverage related company name patterns
 */
const COMPANY_PATTERNS = [
  (adj: string) => `${adj} Coffee`,
  (adj: string) => `Cafe ${adj}`,
  (adj: string) => `${adj} Roasters`,
  (adj: string) => `The ${adj} Bean`,
  (adj: string) => `${adj} Brew`,
  (adj: string) => `${adj} Cup`,
  () => `Cairo Coffee Co.`,
  () => `Alexandria Roasters`,
  () => `Nile Valley Coffee`,
  () => `Pharaoh's Brew`,
];

const COMPANY_ADJECTIVES = [
  'Premium', 'Artisan', 'Golden', 'Royal', 'Grand', 'Elite', 'Classic',
  'Modern', 'Urban', 'Sunrise', 'Oasis', 'Desert', 'Mediterranean',
];

export class RealisticDataGenerator {
  private rng: seedrandom.PRNG;

  constructor(seed?: number) {
    this.rng = seedrandom(seed?.toString() ?? Date.now().toString());
  }

  /**
   * Generate Egyptian phone number in +20 format
   */
  generateEgyptianPhoneNumber(): string {
    const prefix = this.pickOne(PHONE_PREFIXES);
    const number = Math.floor(this.rng() * 100000000).toString().padStart(8, '0');
    return `+20${prefix}${number}`;
  }

  /**
   * Generate Egyptian address
   */
  generateEgyptianAddress(city?: string): {
    street: string;
    area: string;
    city: string;
    governorate: string;
    postalCode: string;
    fullAddress: string;
  } {
    const selectedCity = city ?? this.pickOne(EGYPTIAN_CITIES).name;
    const streetNumber = Math.floor(this.rng() * 200) + 1;
    const streetName = this.pickOne(STREET_NAMES);
    const area = this.generateAreaName(selectedCity);

    const governorate = selectedCity === 'Cairo' || selectedCity === 'Giza'
      ? selectedCity
      : this.pickOne(GOVERNORATES);

    const postalCode = Math.floor(this.rng() * 90000 + 10000).toString();

    return {
      street: `${streetNumber} ${streetName} St`,
      area,
      city: selectedCity,
      governorate,
      postalCode,
      fullAddress: `${streetNumber} ${streetName} St, ${area}, ${selectedCity}, ${governorate} ${postalCode}`,
    };
  }

  /**
   * Generate area name for a city
   */
  private generateAreaName(city: string): string {
    const cairoAreas = ['Maadi', 'Zamalek', 'Heliopolis', 'Nasr City', 'New Cairo', 'Downtown', 'Mohandessin', 'Dokki'];
    const gizaAreas = ['6th of October', 'Sheikh Zayed', 'Haram', 'Faisal'];
    const alexAreas = ['Smouha', 'Roushdy', 'Kafr Abdo', 'Stanley', 'Miami'];

    if (city === 'Cairo') return this.pickOne(cairoAreas);
    if (city === 'Giza') return this.pickOne(gizaAreas);
    if (city === 'Alexandria') return this.pickOne(alexAreas);
    return 'Downtown';
  }

  /**
   * Generate Egyptian company name
   */
  generateEgyptianCompanyName(): string {
    const pattern = this.pickOne(COMPANY_PATTERNS);
    const adjective = this.pickOne(COMPANY_ADJECTIVES);
    return pattern(adjective);
  }

  /**
   * Generate Egyptian tax number (registration number)
   */
  generateEgyptianTaxNumber(): string {
    const main = Math.floor(this.rng() * 1000000000).toString().padStart(9, '0');
    const check = Math.floor(this.rng() * 1000).toString().padStart(3, '0');
    return `${main}-${check}`;
  }

  /**
   * Generate Arabic name
   */
  generateArabicName(gender?: 'male' | 'female'): {
    firstName: string;
    lastName: string;
    fullName: string;
  } {
    const isMale = gender === undefined ? this.rng() > 0.5 : gender === 'male';
    const firstName = isMale
      ? this.pickOne(ARABIC_FIRST_NAMES_MALE)
      : this.pickOne(ARABIC_FIRST_NAMES_FEMALE);
    const lastName = this.pickOne(ARABIC_LAST_NAMES);

    return {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
    };
  }

  /**
   * Generate coordinates near a city
   */
  generateCoordinatesNear(city: string, radiusKm: number = 10): {
    lat: number;
    lng: number;
  } {
    const cityData = EGYPTIAN_CITIES.find((c) => c.name === city) ?? EGYPTIAN_CITIES[0];

    // Convert km to degrees (approximate)
    const radiusDegrees = radiusKm / 111;

    const angle = this.rng() * 2 * Math.PI;
    const distance = this.rng() * radiusDegrees;

    return {
      lat: Math.round((cityData.lat + distance * Math.cos(angle)) * 1000000) / 1000000,
      lng: Math.round((cityData.lng + distance * Math.sin(angle)) * 1000000) / 1000000,
    };
  }

  /**
   * Generate realistic email for a company
   */
  generateCompanyEmail(companyName: string): string {
    const cleanName = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', `${cleanName}.com`];
    const domain = this.pickOne(domains);
    return `info@${cleanName}.${domain.split('.').pop()}`;
  }

  /**
   * Format amount in EGP
   */
  formatEGP(amount: number): string {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Pick random element from array
   */
  private pickOne<T>(array: T[]): T {
    return array[Math.floor(this.rng() * array.length)];
  }
}
