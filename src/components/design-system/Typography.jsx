import { motion } from 'framer-motion';
import { typography, viewportSettings } from '../../styles/designSystem';

/**
 * HeroTitle - Large, impactful hero text
 */
export const HeroTitle = ({
  children,
  className = '',
  animate = true
}) => {
  const Component = animate ? motion.h1 : 'h1';
  const animationProps = animate ? {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: viewportSettings,
    transition: { duration: 0.7, ease: 'easeOut' }
  } : {};

  return (
    <Component
      className={`${typography.hero} text-white ${className}`}
      dir="rtl"
      {...animationProps}
    >
      {children}
    </Component>
  );
};

/**
 * H1 - Primary heading
 */
export const H1 = ({
  children,
  className = '',
  animate = false
}) => {
  const Component = animate ? motion.h1 : 'h1';
  const animationProps = animate ? {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: viewportSettings,
    transition: { duration: 0.6 }
  } : {};

  return (
    <Component
      className={`${typography.h1} text-white ${className}`}
      dir="rtl"
      {...animationProps}
    >
      {children}
    </Component>
  );
};

/**
 * H2 - Section heading
 */
export const H2 = ({
  children,
  className = '',
  animate = false
}) => {
  const Component = animate ? motion.h2 : 'h2';
  const animationProps = animate ? {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: viewportSettings,
    transition: { duration: 0.6 }
  } : {};

  return (
    <Component
      className={`${typography.h2} text-white ${className}`}
      dir="rtl"
      {...animationProps}
    >
      {children}
    </Component>
  );
};

/**
 * H3 - Subsection heading
 */
export const H3 = ({
  children,
  className = '',
  animate = false
}) => {
  const Component = animate ? motion.h3 : 'h3';
  const animationProps = animate ? {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: viewportSettings,
    transition: { duration: 0.5 }
  } : {};

  return (
    <Component
      className={`${typography.h3} text-white ${className}`}
      dir="rtl"
      {...animationProps}
    >
      {children}
    </Component>
  );
};

/**
 * H4 - Minor heading
 */
export const H4 = ({
  children,
  className = ''
}) => (
  <h4
    className={`${typography.h4} text-white ${className}`}
    dir="rtl"
  >
    {children}
  </h4>
);

/**
 * Body - Standard body text
 */
export const Body = ({
  children,
  className = '',
  muted = false
}) => (
  <p
    className={`${typography.body} ${muted ? 'text-white/70' : 'text-white/90'} ${className}`}
    dir="rtl"
  >
    {children}
  </p>
);

/**
 * BodyLarge - Larger body text for emphasis
 */
export const BodyLarge = ({
  children,
  className = '',
  muted = false
}) => (
  <p
    className={`${typography.bodyLarge} ${muted ? 'text-white/70' : 'text-white/90'} ${className}`}
    dir="rtl"
  >
    {children}
  </p>
);

/**
 * SmallText - Smaller text
 */
export const SmallText = ({
  children,
  className = ''
}) => (
  <span
    className={`${typography.small} text-white/60 ${className}`}
    dir="rtl"
  >
    {children}
  </span>
);

/**
 * Caption - Caption/label text
 */
export const Caption = ({
  children,
  className = ''
}) => (
  <span
    className={`${typography.caption} text-white/50 uppercase tracking-wider ${className}`}
    dir="rtl"
  >
    {children}
  </span>
);

/**
 * GoldText - Text with brand gold color
 */
export const GoldText = ({
  children,
  className = ''
}) => (
  <span className={`text-brand-gold ${className}`}>
    {children}
  </span>
);

/**
 * GradientText - Text with gradient effect
 */
export const GradientText = ({
  children,
  className = ''
}) => (
  <span
    className={`bg-gradient-to-r from-brand-gold via-amber-400 to-brand-gold bg-clip-text text-transparent ${className}`}
  >
    {children}
  </span>
);
