import { Star } from '../utils/icons';

const RatingBar = () => {
  return (
    <div className="bg-brand-dark-alt py-16 border-b border-white/5 text-center">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="flex gap-1 mb-2 text-brand-gold">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={24} fill="currentColor" />
            ))}
          </div>
          <p className="text-lg font-bold">דירוג 5.0/5 מבוסס על 28 ביקורות מאומתות</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-right">
          <article className="p-8 bg-white/5 rounded-3xl border border-white/5 shadow-2xl">
            <h4 className="text-gold font-bold mb-3 text-xl font-serif text-right">
              מבט של בן-בית
            </h4>
            <p className="text-gray-400 font-light leading-relaxed text-right">
              הסיור שלי מבוסס על היכרות עמוקה עם הסמטאות שבהן גדלתי. זו לא הדרכה חיצונית, אלא הצצה נדירה לחיים החרדיים שלי.
            </p>
          </article>
          
          <article className="p-8 bg-white/5 rounded-3xl border border-white/5 shadow-2xl text-right">
            <h4 className="text-brand-gold font-bold mb-3 text-xl font-serif text-right">
              טעימות בלעדיות
            </h4>
            <p className="text-gray-400 font-light leading-relaxed text-right">
              נבקר רק במקומות הטובים ביותר של האוכל היהודי, מקומות שעוברים בבני ברק מפה לאוזן. ששש... תשמרו גם אתם את הסוד.
            </p>
          </article>
          
          <article className="p-8 bg-white/5 rounded-3xl border border-white/5 shadow-2xl text-right">
            <h4 className="text-brand-gold font-bold mb-3 text-xl font-serif text-right">
              גשר בין עולמות
            </h4>
            <p className="text-gray-400 font-light leading-relaxed text-right">
              סיור מלא הומור ושיח פתוח. כאן כל שאלה מתקבלת בחיוך.
            </p>
          </article>
        </div>
      </div>
    </div>
  );
};

export default RatingBar;
