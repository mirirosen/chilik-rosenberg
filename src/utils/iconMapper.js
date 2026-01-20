import * as LucideIcons from 'lucide-react';

/**
 * Map icon names (kebab-case) to Lucide React components
 */
export const getIcon = (iconName) => {
  // Icon name mapping (kebab-case to PascalCase)
  const iconMap = {
    'layers': 'Layers',
    'heart': 'Heart',
    'home': 'Home',
    'book-open': 'BookOpen',
    'coins': 'Coins',
    'users': 'Users',
    'croissant': 'Croissant',
    'heart-handshake': 'HeartHandshake',
    'monitor': 'Monitor',
    'soup': 'Soup',
    'fish': 'Fish',
    'utensils': 'Utensils',
    'tv': 'Tv'
  };

  const componentName = iconMap[iconName];
  const IconComponent = componentName ? LucideIcons[componentName] : LucideIcons.Circle;
  
  return IconComponent || LucideIcons.Circle;
};
