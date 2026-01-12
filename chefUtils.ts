// Centralized chef management utility
export interface ChefInfo {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  personality: string;
  greeting: string;
  attitude: string;
  nextChef?: {
    name: string;
    avatar: string;
    daysUntilNext: number;
  };
}

// Unified AI Chef system that syncs with server
export interface WeeklyChef {
  id: string;
  name: string;
  personality: string;
  specialties: string[];
  image: string;
  avatar: string; // Alias for image to ensure compatibility
  imagePath: string; // Server compatibility
  greeting: string;
  speciality: string; // Server compatibility
  favoriteMeal: string;
  description: string;
  wimpAchievements: string[];
}

export const chefCharacters: WeeklyChef[] = [
  {
    id: 'otter',
    name: 'Chef Ollie',
    personality: 'Wise scholar with scientific precision, loves experimenting with fermentation and molecular gastronomy',
    specialties: ['Scientific Cooking', 'Fermentation', 'Molecular Gastronomy'],
    speciality: 'Scientific cooking and molecular gastronomy',
    image: '/attached_assets/ChefOtterCorrect.png',
    avatar: '/attached_assets/ChefOtterCorrect.png',
    imagePath: '/attached_assets/ChefOtterCorrect.png',
    greeting: 'Greetings, fellow culinary explorer! I am Chef Ollie, your dedicated kitchen scientist ready to unlock the mysteries of molecular gastronomy!',
    favoriteMeal: 'Molecular Spherification Ravioli',
    description: 'A brilliant otter chef with a PhD in Culinary Science, specializing in molecular gastronomy and fermentation techniques.',
    wimpAchievements: ['Kitchen Scientist Medal', 'Fermentation Master', 'Molecular Gastronomy Pioneer']
  },
  {
    id: 'cat',
    name: 'Chef Cleo',
    personality: 'Energetic innovator with French elegance, focuses on fusion cooking and artistic presentation',
    specialties: ['French Cuisine', 'Fusion Cooking', 'Artistic Plating'],
    speciality: 'French cuisine and fusion cooking',
    image: '/attached_assets/ChefCat_1749984413841.png',
    avatar: '/attached_assets/ChefCat_1749984413841.png',
    imagePath: '/attached_assets/ChefCat_1749984413841.png',
    greeting: 'Bonjour! I am Chef Cleo, bringing French elegance and innovative fusion techniques to your kitchen adventures!',
    favoriteMeal: 'Duck Confit with Lavender Honey Glaze',
    description: 'An elegant French-trained cat chef known for artistic plating and innovative fusion techniques.',
    wimpAchievements: ['French Cuisine Master', 'Fusion Innovation Award', 'Artistic Presentation Expert']
  },
  {
    id: 'buffalo',
    name: 'Chef Rumpus',
    personality: 'Lovable goofball with Western humor, specializes in BBQ and comfort food',
    specialties: ['BBQ', 'Comfort Food', 'Regional American'],
    speciality: 'BBQ and American comfort food',
    image: '/attached_assets/ChefBuffalo_1749984735804.png',
    avatar: '/attached_assets/ChefBuffalo_1749984735804.png',
    imagePath: '/attached_assets/ChefBuffalo_1749984735804.png',
    greeting: 'Howdy partner! Chef Rumpus here, ready to rustle up some soul-warming BBQ and comfort food that\'ll make you holler for more!',
    favoriteMeal: 'Slow-Smoked Brisket with Bourbon Glaze',
    description: 'A hearty buffalo chef with a big personality and even bigger appetite for comfort food and BBQ.',
    wimpAchievements: ['BBQ Pitmaster', 'Comfort Food Champion', 'Western Cooking Legend']
  }
];

/**
 * Get current weekly chef - synchronized with server rotation
 * This ensures ALL components use the same chef
 */
export function getCurrentChef(): WeeklyChef {
  // Use same algorithm as server to ensure perfect sync
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1); // January 1st of current year
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const week = Math.floor(dayOfYear / 7);
  const chefIndex = week % chefCharacters.length;

  const currentChef = chefCharacters[chefIndex];
  console.log(`🍳 CHEF SYNC: Week ${week}, Index ${chefIndex}, Chef: ${currentChef.name}`);

  return currentChef;
}

/**
 * Force refresh chef data - useful for debugging
 */
export function refreshCurrentChef(): WeeklyChef {
  const chef = getCurrentChef();
  console.log('🔄 Chef refreshed:', chef);
  return chef;
}

// Get current week number (1-52)
export const getCurrentWeek = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek) + 1;
};

// Get chef image by ID
export const getChefImage = (chefId: string): string => {
  const chefImages = {
    'otter': '/attached_assets/ChefOtterCorrect.png',
    'cat': '/attached_assets/ChefCat_1749984413841.png',
    'buffalo': '/attached_assets/ChefBuffalo_1749984735804.png'
  };
  return chefImages[chefId as keyof typeof chefImages] || '/attached_assets/ChefOtterCorrect.png';
};

// Get chef emoji by ID
export const getChefEmoji = (chefId: string): string => {
  const chefEmojis = {
    'otter': '🦦',
    'cat': '🐱',
    'buffalo': '🐃'
  };
  return chefEmojis[chefId as keyof typeof chefEmojis] || '🦦';
};

export const getChefPersonality = (chefName: string): string => {
  const personalities: Record<string, string> = {
    rumpus: "playful and energetic buffalo chef who loves bold flavors",
    otter: "calm and methodical otter chef focused on technique and precision",
    cat: "sophisticated and precise cat chef with classical training"
  };

  const normalizedName = chefName.toLowerCase().replace(/chef\s*/i, '');
  return personalities[normalizedName] || personalities.rumpus;
};