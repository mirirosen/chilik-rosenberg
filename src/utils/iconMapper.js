import { 
  Layers, 
  Heart, 
  Home, 
  BookOpen, 
  Coins, 
  Users, 
  Croissant, 
  HeartHandshake, 
  Monitor, 
  Soup, 
  Fish, 
  Utensils, 
  Tv,
  Scale,
  Cookie,
  Circle
} from './icons';

/**
 * Map icon names (kebab-case) to Lucide React components
 */
export const getIcon = (iconName) => {
  // Icon name mapping (kebab-case to Component)
  const iconMap = {
    'layers': Layers,
    'heart': Heart,
    'home': Home,
    'book-open': BookOpen,
    'coins': Coins,
    'users': Users,
    'croissant': Croissant,
    'heart-handshake': HeartHandshake,
    'monitor': Monitor,
    'soup': Soup,
    'fish': Fish,
    'utensils': Utensils,
    'tv': Tv,
    'scale': Scale,
    'cookie': Cookie
  };

  return iconMap[iconName] || Circle;
};
