import { motion } from 'framer-motion';

/**
 * Button - Animated button component with multiple variants
 *
 * @param {React.ReactNode} children - Button content
 * @param {string} variant - 'primary' | 'secondary' | 'ghost' | 'gold'
 * @param {string} size - 'lg' | 'md' | 'sm'
 * @param {string} className - Additional CSS classes
 * @param {boolean} fullWidth - Whether button should be full width
 * @param {React.ReactNode} icon - Optional icon element
 * @param {string} iconPosition - 'start' | 'end'
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'lg',
  className = '',
  fullWidth = false,
  icon,
  iconPosition = 'end',
  disabled = false,
  ...props
}) => {
  const baseStyles = `
    font-bold rounded-full transition-all
    inline-flex items-center justify-center gap-3
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variants = {
    primary: `
      bg-brand-gold text-brand-dark
      hover:bg-amber-400 hover:shadow-lg hover:shadow-brand-gold/30
      active:bg-amber-500
    `,
    secondary: `
      bg-white/10 backdrop-blur-md border border-white/20 text-white
      hover:bg-white/20 hover:border-white/30
      active:bg-white/25
    `,
    ghost: `
      bg-transparent text-white border border-white/30
      hover:bg-white/10 hover:border-white/50
      active:bg-white/15
    `,
    gold: `
      bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600
      text-brand-dark font-bold
      hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500
      shadow-lg shadow-amber-500/30
    `,
    whatsapp: `
      bg-whatsapp text-white
      hover:bg-green-500 hover:shadow-lg hover:shadow-whatsapp/30
      active:bg-green-600
    `,
  };

  const sizes = {
    lg: 'px-8 py-4 text-xl',
    md: 'px-6 py-3 text-lg',
    sm: 'px-4 py-2 text-base',
    xs: 'px-3 py-1.5 text-sm',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${widthClass}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'start' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
      {icon && iconPosition === 'end' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </motion.button>
  );
};

/**
 * IconButton - Circular icon-only button
 */
export const IconButton = ({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  label,
  ...props
}) => {
  const baseStyles = `
    rounded-full transition-all
    inline-flex items-center justify-center
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold
  `;

  const variants = {
    primary: 'bg-brand-gold text-brand-dark hover:bg-amber-400',
    secondary: 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20',
    ghost: 'bg-transparent text-white hover:bg-white/10',
  };

  const sizes = {
    lg: 'w-14 h-14 text-2xl',
    md: 'w-12 h-12 text-xl',
    sm: 'w-10 h-10 text-lg',
    xs: 'w-8 h-8 text-base',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      aria-label={label}
      {...props}
    >
      {children}
    </motion.button>
  );
};

/**
 * LinkButton - Text link styled as button
 */
export const LinkButton = ({
  children,
  className = '',
  underline = true,
  ...props
}) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    className={`
      text-brand-gold font-semibold transition-all
      ${underline ? 'hover:underline underline-offset-4' : ''}
      ${className}
    `}
    {...props}
  >
    {children}
  </motion.button>
);

export default Button;
