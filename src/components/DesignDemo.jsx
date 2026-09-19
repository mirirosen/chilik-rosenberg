import { motion } from 'framer-motion';
import { Section, SectionHeader, H2, H3, Body, BodyLarge, GoldText, GradientText } from './design-system';
import { Button, IconButton } from './design-system/Button';
import { FoodImagePlaceholder, UnsplashFoodImage } from './food';
import { ArrowLeft, ChefHat, Star, Calendar } from 'lucide-react';

/**
 * DesignDemo - Showcase of all new design system components
 * Access at /design-demo
 */
const DesignDemo = () => {
  return (
    <div className="min-h-screen bg-brand-dark text-white" dir="rtl">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            <GoldText>Design System Demo</GoldText>
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.history.pushState({}, '', '/');
              window.location.reload();
            }}
          >
            חזרה לאתר
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="pt-24">
        {/* Hero Demo */}
        <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 via-brand-dark to-brand-dark" />

          {/* Content */}
          <motion.div
            className="relative z-10 text-center px-6"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <span className="inline-block px-6 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-brand-gold text-sm mb-8">
                ✨ Phase 1 - Design System Ready
              </span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-tight mb-6">
              <GradientText>חוויה קולינרית</GradientText>
              <br />
              <span className="text-white">מעולם אחר</span>
            </h1>

            <BodyLarge className="max-w-2xl mx-auto mb-10 text-white/70">
              הדמו הזה מציג את כל הקומפוננטות החדשות של ה-Design System
              כולל אנימציות, כפתורים, וplaceholders לתמונות
            </BodyLarge>

            <div className="flex flex-wrap gap-4 justify-center">
              <Button variant="primary" icon={<Calendar className="w-5 h-5" />}>
                הזמן סיור
              </Button>
              <Button variant="secondary" icon={<Star className="w-5 h-5" />}>
                גלה עוד
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Buttons Section */}
        <Section background="bg-brand-dark-section">
          <SectionHeader
            title="כפתורים"
            subtitle="וריאנטים שונים של כפתורים עם אנימציות"
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <Button variant="primary" className="mb-4">Primary</Button>
              <p className="text-white/50 text-sm">כפתור ראשי</p>
            </div>
            <div className="text-center">
              <Button variant="secondary" className="mb-4">Secondary</Button>
              <p className="text-white/50 text-sm">כפתור משני</p>
            </div>
            <div className="text-center">
              <Button variant="ghost" className="mb-4">Ghost</Button>
              <p className="text-white/50 text-sm">כפתור שקוף</p>
            </div>
            <div className="text-center">
              <Button variant="gold" className="mb-4">Gold</Button>
              <p className="text-white/50 text-sm">כפתור זהב</p>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-12">
            <IconButton variant="primary" label="Chef">
              <ChefHat className="w-6 h-6" />
            </IconButton>
            <IconButton variant="secondary" label="Star">
              <Star className="w-6 h-6" />
            </IconButton>
            <IconButton variant="ghost" label="Calendar">
              <Calendar className="w-6 h-6" />
            </IconButton>
          </div>
        </Section>

        {/* Food Placeholders Section */}
        <Section>
          <SectionHeader
            title="תמונות מאכלים"
            subtitle="Placeholders מעוצבים עד שיהיו תמונות אמיתיות"
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FoodImagePlaceholder
              dish="קוגל תפוח אדמה"
              emoji="🥔"
              gradient="warm"
            />
            <FoodImagePlaceholder
              dish="חומוס ירושלמי"
              emoji="🧆"
              gradient="golden"
            />
            <FoodImagePlaceholder
              dish="שקשוקה"
              emoji="🍳"
              gradient="spice"
            />
            <FoodImagePlaceholder
              dish="פיתה טרייה"
              emoji="🫓"
              gradient="earth"
            />
            <FoodImagePlaceholder
              dish="סלט ישראלי"
              emoji="🥗"
              gradient="olive"
            />
            <FoodImagePlaceholder
              dish="קינוח מזרחי"
              emoji="🍯"
              gradient="dark"
            />
          </div>
        </Section>

        {/* Typography Section */}
        <Section background="bg-gradient-to-b from-brand-dark to-brand-dark-section">
          <SectionHeader
            title="טיפוגרפיה"
            subtitle="היררכיה ברורה של כותרות וטקסט"
          />

          <div className="space-y-8 max-w-3xl mx-auto">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-brand-gold text-sm mb-2">Hero Title</p>
              <h1 className="text-5xl md:text-7xl font-black">כותרת ראשית</h1>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-brand-gold text-sm mb-2">H2</p>
              <H2>כותרת משנית</H2>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-brand-gold text-sm mb-2">H3</p>
              <H3>כותרת תת-סעיף</H3>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-brand-gold text-sm mb-2">Body Text</p>
              <Body>
                טקסט גוף רגיל עם קריאות טובה. אנחנו משתמשים בפונטים שתומכים בעברית ובאנגלית כדי להבטיח חוויה מושלמת לכל המשתמשים.
              </Body>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-brand-gold text-sm mb-2">Gradient Text</p>
              <span className="text-4xl font-bold">
                <GradientText>טקסט עם גרדיאנט זהב</GradientText>
              </span>
            </div>
          </div>
        </Section>

        {/* Animation Demo */}
        <Section>
          <SectionHeader
            title="אנימציות"
            subtitle="כל הקומפוננטות מאנימציות עם Framer Motion"
          />

          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="p-8 bg-white/5 rounded-3xl border border-white/10"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.6 }}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <div className="text-5xl mb-4">{['🍽️', '🎯', '⭐'][i-1]}</div>
                <H3 className="mb-2">כרטיס {i}</H3>
                <Body muted>
                  העבר את העכבר מעל הכרטיס כדי לראות את אפקט ההגדלה
                </Body>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* Glass Effect Demo */}
        <Section className="relative">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, #D4AF37 0%, transparent 50%), radial-gradient(circle at 80% 50%, #E9C46A 0%, transparent 50%)',
            }} />
          </div>

          <div className="relative z-10">
            <SectionHeader
              title="אפקט זכוכית"
              subtitle="Glass morphism מודרני"
            />

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="p-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl">
                <H3 className="mb-4">Glass Card</H3>
                <Body muted>
                  כרטיס עם אפקט שקיפות וטשטוש רקע
                </Body>
              </div>
              <div className="p-8 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl">
                <H3 className="mb-4">Dark Glass</H3>
                <Body muted>
                  וריאנט כהה יותר לרקעים בהירים
                </Body>
              </div>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <footer className="py-12 border-t border-white/10 text-center">
          <Body muted>
            Phase 1 Complete - Design System Ready for Integration
          </Body>
          <Button
            variant="primary"
            className="mt-6"
            onClick={() => {
              window.history.pushState({}, '', '/');
              window.location.reload();
            }}
          >
            חזרה לאתר הראשי
          </Button>
        </footer>
      </main>
    </div>
  );
};

export default DesignDemo;
