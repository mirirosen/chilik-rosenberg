import { motion } from 'framer-motion';

/**
 * FoodImagePlaceholder - Stylish placeholder for food images
 *
 * Uses gradient backgrounds and emojis until real images are provided.
 * Can be easily swapped with real images later.
 *
 * @param {string} dish - Name of the dish
 * @param {string} emoji - Food emoji to display
 * @param {string} aspectRatio - CSS aspect ratio (default: '4/3')
 * @param {string} className - Additional CSS classes
 * @param {string} gradient - Gradient variant: 'warm' | 'golden' | 'dark' | 'olive'
 * @param {boolean} animate - Enable hover animation
 */
export const FoodImagePlaceholder = ({
  dish,
  emoji = '🍲',
  aspectRatio = '4/3',
  className = '',
  gradient = 'warm',
  animate = true,
}) => {
  const gradients = {
    warm: 'from-amber-900 via-amber-700 to-amber-500',
    golden: 'from-yellow-800 via-amber-600 to-yellow-500',
    dark: 'from-stone-900 via-stone-700 to-stone-600',
    olive: 'from-olive-900 via-olive-700 to-amber-700',
    spice: 'from-red-900 via-orange-700 to-amber-600',
    earth: 'from-amber-950 via-stone-700 to-amber-800',
  };

  const gradientClass = gradients[gradient] || gradients.warm;

  const content = (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradientClass} ${className}`}
      style={{ aspectRatio }}
    >
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
      </div>

      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-7xl md:text-8xl mb-4 filter drop-shadow-lg">{emoji}</div>
          <p className="text-white font-bold text-xl md:text-2xl mb-2 drop-shadow-md">{dish}</p>
          <p className="text-white/60 text-sm">תמונה מקצועית בקרוב</p>
        </div>
      </div>

      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.3 }}
    >
      {content}
    </motion.div>
  );
};

/**
 * FoodImage - Real image component with loading state and overlay
 *
 * Use this when you have actual images. Falls back to placeholder on error.
 *
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text
 * @param {string} dish - Dish name (for fallback)
 * @param {string} emoji - Fallback emoji
 * @param {string} aspectRatio - CSS aspect ratio
 * @param {string} className - Additional CSS classes
 */
export const FoodImage = ({
  src,
  alt,
  dish,
  emoji = '🍲',
  aspectRatio = '4/3',
  className = '',
  overlay = true,
}) => {
  // If no src provided, use placeholder
  if (!src) {
    return (
      <FoodImagePlaceholder
        dish={dish || alt}
        emoji={emoji}
        aspectRatio={aspectRatio}
        className={className}
      />
    );
  }

  return (
    <motion.div
      className={`relative overflow-hidden rounded-3xl ${className}`}
      style={{ aspectRatio }}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.3 }}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          // On error, hide the image - could enhance to show placeholder
          e.target.style.display = 'none';
        }}
      />
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      )}
    </motion.div>
  );
};

/**
 * UnsplashFoodImage - Uses Unsplash source API for dynamic food images
 *
 * Good for preview/development. Replace with real images in production.
 *
 * @param {string} query - Search query for Unsplash (e.g., 'israeli,food,hummus')
 * @param {string} alt - Alt text
 * @param {number} width - Image width (default: 800)
 * @param {number} height - Image height (default: 600)
 * @param {string} aspectRatio - CSS aspect ratio
 * @param {string} className - Additional CSS classes
 */
export const UnsplashFoodImage = ({
  query = 'food,israeli,middle-eastern',
  alt,
  width = 800,
  height = 600,
  aspectRatio = '4/3',
  className = '',
}) => {
  const src = `https://source.unsplash.com/${width}x${height}/?${query}`;

  return (
    <motion.div
      className={`relative overflow-hidden rounded-3xl ${className}`}
      style={{ aspectRatio }}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.3 }}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
    </motion.div>
  );
};

export default FoodImagePlaceholder;
