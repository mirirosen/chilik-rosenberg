import { motion } from 'framer-motion';
import { spacing, viewportSettings } from '../../styles/designSystem';

/**
 * Section - Reusable section wrapper with optional animation
 *
 * @param {React.ReactNode} children - Section content
 * @param {string} className - Additional CSS classes
 * @param {boolean} animate - Enable scroll-triggered animation
 * @param {string} variant - Section variant: 'default' | 'tight' | 'wide' | 'narrow'
 * @param {string} id - Section ID for navigation
 * @param {string} background - Background color class
 */
export const Section = ({
  children,
  className = '',
  animate = true,
  variant = 'default',
  id,
  background = '',
}) => {
  // Section spacing variants
  const spacingVariants = {
    default: spacing.section,
    tight: spacing.sectionTight,
  };

  // Container width variants
  const containerVariants = {
    default: spacing.container,
    wide: spacing.containerWide,
    narrow: spacing.containerNarrow,
  };

  const sectionSpacing = spacingVariants[variant] || spacingVariants.default;
  const containerWidth = containerVariants[variant] || containerVariants.default;

  const content = (
    <section
      id={id}
      className={`${sectionSpacing} ${background} ${className}`}
      dir="rtl"
    >
      <div className={containerWidth}>
        {children}
      </div>
    </section>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportSettings}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {content}
    </motion.div>
  );
};

/**
 * SectionHeader - Consistent section header with title and optional subtitle
 */
export const SectionHeader = ({
  title,
  subtitle,
  align = 'center',
  className = ''
}) => {
  const alignmentClasses = {
    center: 'text-center',
    start: 'text-start',
    end: 'text-end',
  };

  return (
    <div className={`mb-12 md:mb-16 ${alignmentClasses[align]} ${className}`}>
      <motion.h2
        className="text-3xl md:text-5xl font-bold text-white mb-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportSettings}
        transition={{ duration: 0.5 }}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportSettings}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
};

export default Section;
