import React from 'react';
import { motion } from 'framer-motion';

interface SectionHeaderProps {
  tag?: string;
  title: string;
  titleItalic?: string;
  subtitle?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  light?: boolean;
  accentColor?: 'pink' | 'orange' | 'blue';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  tag,
  title,
  titleItalic,
  subtitle,
  align = 'center',
  className = '',
  light = false,
  accentColor = 'pink',
}) => {
  const alignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center mx-auto',
    right: 'text-right items-end ml-auto',
  };

  const accentStyles = {
    pink: {
      dot: 'bg-brand-pink',
      tagText: 'text-brand-pink',
      italicText: 'text-brand-pink',
    },
    orange: {
      dot: 'bg-brand-orange',
      tagText: 'text-brand-orange',
      italicText: 'text-brand-orange',
    },
    blue: {
      dot: 'bg-brand-blue',
      tagText: 'text-brand-blue',
      italicText: 'text-brand-blue',
    },
  }[accentColor];

  return (
    <div className={`flex flex-col max-w-3xl ${alignmentClasses[align]} ${className}`}>
      {tag && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 mb-3"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${accentStyles.dot}`} />
          <span className={`text-xs font-semibold uppercase tracking-[0.25em] ${accentStyles.tagText}`}>
            {tag}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${accentStyles.dot}`} />
        </motion.div>
      )}

      <motion.h2
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className={`font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight leading-[1.12] mb-4 ${
          light ? 'text-brand-charcoalDeep' : 'text-brand-cream'
        }`}
      >
        {title}{' '}
        {titleItalic && (
          <span className={`font-italic-accent font-normal ${accentStyles.italicText} italic ml-1`}>
            {titleItalic}
          </span>
        )}
      </motion.h2>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`text-base sm:text-lg font-light leading-relaxed max-w-2xl text-balance ${
            light ? 'text-brand-dark/70' : 'text-brand-subtle'
          }`}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
};
