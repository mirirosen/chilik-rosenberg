import { useState, useMemo } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { getUpcomingThursdays, formatDateHebrew } from '../utils/dateUtils';
import { sendBookingEmails } from '../utils/emailService';
import { Users, Phone, Mail, MessageSquare, Calendar, Plus, Minus } from '../utils/icons';

const PRICE_PER_PERSON = 250;

const BookingForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    participants: 1,
    tourDate: '',
    notes: '',
    howDidYouHear: '',
    dateOfBirth: '',
    paymentMethod: '',
    agreeToTerms: false
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const cloudData = useFirebaseData();
  const thursdays = useMemo(() => getUpcomingThursdays(12), []);

  const getDateStatus = (dateStr) => {
    if (!cloudData) return { available: true, label: 'בודק...' };
    if (cloudData.blocked?.includes(dateStr)) return { available: false, label: 'אין סיור' };
    if (cloudData.soldOut?.includes(dateStr)) return { available: false, label: 'אזל המקום' };
    return { available: true, label: 'זמין' };
  };

  const availableDates = thursdays.filter(t => getDateStatus(t.dateStr).available);

  const validatePhone = (phone) => {
    // Israeli phone format: 05X-XXXXXXX or 05XXXXXXXX
    const phoneRegex = /^(05\d{1}-?\d{7}|05\d{8})$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const validateThursdayDate = (dateStr) => {
    if (!dateStr) return false;
    
    // Check if it's a Thursday
    const date = new Date(dateStr + 'T00:00:00');
    if (date.getDay() !== 4) {
      return false;
    }
    
    // Check if date is not blocked or sold out
    const status = getDateStatus(dateStr);
    return status.available;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'שם מלא הוא שדה חובה';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'טלפון / WhatsApp הוא שדה חובה';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'מספר טלפון לא תקין (פורמט: 05X-XXXXXXX)';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'כתובת אימייל היא שדה חובה';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'כתובת אימייל לא תקינה';
    }

    if (!formData.howDidYouHear) {
      newErrors.howDidYouHear = 'יש לבחור כיצד הגעת אלינו';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'תאריך לידה הוא שדה חובה';
    } else {
      const age = validateAge(formData.dateOfBirth);
      if (age < 18) {
        newErrors.dateOfBirth = 'הרשמה מותרת רק למעל גיל 18';
      }
    }

    if (!formData.tourDate) {
      newErrors.tourDate = 'יש לבחור תאריך סיור';
    } else if (!validateThursdayDate(formData.tourDate)) {
      const date = new Date(formData.tourDate + 'T00:00:00');
      if (date.getDay() !== 4) {
        newErrors.tourDate = 'ניתן לבחור רק ימי חמישי';
      } else {
        newErrors.tourDate = 'התאריך שנבחר אינו זמין (חסום או אזל המקום)';
      }
    }

    if (formData.participants < 1 || formData.participants > 20) {
      newErrors.participants = 'מספר המשתתפים חייב להיות בין 1 ל-20';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'יש לבחור אמצעי תשלום';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'יש לאשר את תנאי השימוש והתקנון';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate booking ID
      const bookingId = `BK${Date.now()}`;
      const totalPrice = formData.participants * PRICE_PER_PERSON;

      // Prepare booking data
      const bookingData = {
        bookingId,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        participants: parseInt(formData.participants),
        tourDate: formData.tourDate,
        notes: formData.notes.trim(),
        howDidYouHear: formData.howDidYouHear,
        dateOfBirth: formData.dateOfBirth,
        paymentMethod: formData.paymentMethod,
        totalPrice,
        pricePerPerson: PRICE_PER_PERSON,
        status: 'pending', // pending, confirmed, cancelled
        paymentStatus: 'pending', // pending, completed, failed (for future Morning integration)
        morningBookingId: null, // Will be filled when Morning API is integrated
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'bookings'), bookingData);
      console.log('Booking saved with ID:', docRef.id);

      // Send emails (non-blocking - don't wait for this)
      sendBookingEmails({
        ...bookingData,
        tourDate: formatDateHebrew(formData.tourDate)
      }).then(results => {
        if (!results.admin.success || !results.customer.success) {
          console.warn('Email sending had issues:', results);
        }
      });

      // Call success callback with booking data
      if (onSuccess) {
        onSuccess({
          ...bookingData,
          firestoreId: docRef.id
        });
      }

    } catch (error) {
      console.error('Error creating booking:', error);
      setSubmitError('אירעה שגיאה בשמירת ההזמנה. אנא נסה שוב או צור קשר טלפונית.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const totalPrice = formData.participants * PRICE_PER_PERSON;

  return (
    <div className="bg-brand-dark-lighter p-8 md:p-12 rounded-5xl border border-white/10 shadow-2xl">
      <h2 className="text-3xl md:text-5xl font-serif text-brand-gold text-center mb-8 font-bold">
        הרשמה לסיור
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-bold mb-2 text-right">
            שם מלא <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full bg-brand-dark border ${errors.name ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-right`}
            placeholder="הזן שם מלא"
            disabled={isSubmitting}
          />
          {errors.name && <p className="text-red-400 text-sm mt-1 text-right">{errors.name}</p>}
        </div>

        {/* Phone Field */}
        <div>
          <label htmlFor="phone" className="block text-sm font-bold mb-2 text-right">
            <Phone size={16} className="inline ml-2" />
            טלפון / WhatsApp <span className="text-red-400">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className={`w-full bg-brand-dark border ${errors.phone ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-right`}
            placeholder="05X-XXXXXXX"
            disabled={isSubmitting}
          />
          {errors.phone && <p className="text-red-400 text-sm mt-1 text-right">{errors.phone}</p>}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-bold mb-2 text-right">
            <Mail size={16} className="inline ml-2" />
            אימייל <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full bg-brand-dark border ${errors.email ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-right`}
            placeholder="example@mail.com"
            disabled={isSubmitting}
            dir="ltr"
          />
          {errors.email && <p className="text-red-400 text-sm mt-1 text-right">{errors.email}</p>}
        </div>

        {/* How Did You Hear About Us */}
        <div>
          <label htmlFor="howDidYouHear" className="block text-sm font-bold mb-2 text-right">
            איך הגעת אלינו? <span className="text-red-400">*</span>
          </label>
          <select
            id="howDidYouHear"
            value={formData.howDidYouHear}
            onChange={(e) => handleInputChange('howDidYouHear', e.target.value)}
            className={`w-full bg-brand-dark border ${errors.howDidYouHear ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-right`}
            disabled={isSubmitting}
          >
            <option value="">בחר אפשרות</option>
            <option value="friend">המלצה מחבר/ה</option>
            <option value="google">חיפוש בגוגל</option>
            <option value="facebook">פייסבוק</option>
            <option value="instagram">אינסטגרם</option>
            <option value="other">אחר</option>
          </select>
          {errors.howDidYouHear && <p className="text-red-400 text-sm mt-1 text-right">{errors.howDidYouHear}</p>}
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-bold mb-2 text-right">
            תאריך לידה <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            id="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
            className={`w-full bg-brand-dark border ${errors.dateOfBirth ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-center`}
            style={{ colorScheme: 'dark' }}
            disabled={isSubmitting}
          />
          {errors.dateOfBirth && <p className="text-red-400 text-sm mt-1 text-right">{errors.dateOfBirth}</p>}
          <p className="text-xs text-gray-400 mt-1 text-right">חובה להיות מעל גיל 18</p>
        </div>

        {/* Tour Date Selection - Date Picker (Thursdays Only) */}
        <div>
          <label htmlFor="tourDate" className="block text-sm font-bold mb-2 text-right">
            <Calendar size={16} className="inline ml-2" />
            תאריך הסיור <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            id="tourDate"
            value={formData.tourDate}
            onChange={(e) => {
              const selectedDate = e.target.value;
              handleInputChange('tourDate', selectedDate);
              
              // Validate on change
              if (selectedDate) {
                const date = new Date(selectedDate + 'T00:00:00');
                if (date.getDay() !== 4) {
                  setErrors(prev => ({ ...prev, tourDate: 'ניתן לבחור רק ימי חמישי' }));
                } else if (!validateThursdayDate(selectedDate)) {
                  setErrors(prev => ({ ...prev, tourDate: 'התאריך שנבחר אינו זמין (חסום או אזל המקום)' }));
                }
              }
            }}
            min={new Date().toISOString().split('T')[0]}
            className={`w-full bg-brand-dark border ${errors.tourDate ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-center`}
            style={{ colorScheme: 'dark' }}
            disabled={isSubmitting}
          />
          {errors.tourDate && <p className="text-red-400 text-sm mt-1 text-right">{errors.tourDate}</p>}
          <div className="mt-2 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3">
            <p className="text-xs text-blue-300 text-right">
              💡 ניתן לבחור רק ימי חמישי. תאריכים זמינים: {availableDates.length > 0 ? availableDates.slice(0, 3).map(d => formatDateHebrew(d.dateStr)).join(', ') : 'אין תאריכים זמינים'}
              {availableDates.length > 3 && ' ועוד...'}
            </p>
          </div>
        </div>

        {/* Number of Participants - Manual Input with +/- Buttons */}
        <div>
          <label htmlFor="participants" className="block text-sm font-bold mb-2 text-right">
            <Users size={16} className="inline ml-2" />
            מספר משתתפים <span className="text-red-400">*</span>
            <span className="text-xs text-gray-400 font-normal mr-2">(1-20)</span>
          </label>
          <div className="flex items-center gap-3">
            {/* Decrement Button */}
            <button
              type="button"
              onClick={() => {
                const newValue = Math.max(1, parseInt(formData.participants) - 1);
                handleInputChange('participants', newValue);
              }}
              disabled={isSubmitting || formData.participants <= 1}
              className="bg-brand-dark border border-white/20 text-brand-gold rounded-xl p-4 hover:bg-brand-gold hover:text-brand-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-brand-dark disabled:hover:text-brand-gold"
              aria-label="Decrease participants"
            >
              <Minus size={20} />
            </button>

            {/* Number Input */}
            <input
              type="number"
              id="participants"
              value={formData.participants}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                if (value >= 1 && value <= 20) {
                  handleInputChange('participants', value);
                } else if (value > 20) {
                  handleInputChange('participants', 20);
                  setErrors(prev => ({ ...prev, participants: 'מספר המשתתפים חייב להיות בין 1 ל-20' }));
                } else {
                  handleInputChange('participants', 1);
                }
              }}
              onBlur={(e) => {
                // Ensure valid value on blur
                const value = parseInt(e.target.value);
                if (isNaN(value) || value < 1) {
                  handleInputChange('participants', 1);
                } else if (value > 20) {
                  handleInputChange('participants', 20);
                }
              }}
              min="1"
              max="20"
              className={`flex-1 bg-brand-dark border ${errors.participants ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white text-center text-2xl font-bold outline-none focus:border-brand-gold`}
              style={{ colorScheme: 'dark' }}
              disabled={isSubmitting}
            />

            {/* Increment Button */}
            <button
              type="button"
              onClick={() => {
                const newValue = Math.min(20, parseInt(formData.participants) + 1);
                handleInputChange('participants', newValue);
              }}
              disabled={isSubmitting || formData.participants >= 20}
              className="bg-brand-dark border border-white/20 text-brand-gold rounded-xl p-4 hover:bg-brand-gold hover:text-brand-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-brand-dark disabled:hover:text-brand-gold"
              aria-label="Increase participants"
            >
              <Plus size={20} />
            </button>
          </div>
          {errors.participants && <p className="text-red-400 text-sm mt-1 text-right">{errors.participants}</p>}
        </div>

        {/* Price Display */}
        <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-2xl p-4 text-center">
          <div className="text-sm text-gray-300 mb-1">מחיר כולל</div>
          <div className="text-3xl font-black text-brand-gold">
            ₪{totalPrice}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {formData.participants} × ₪{PRICE_PER_PERSON} לאדם
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-bold mb-3 text-right">
            אמצעי תשלום <span className="text-red-400">*</span>
          </label>
          <div className="space-y-3">
            <label className="flex items-center justify-end gap-3 cursor-pointer bg-brand-dark border border-white/20 rounded-2xl p-4 hover:border-brand-gold transition-all">
              <span className="text-white">Bit</span>
              <input
                type="radio"
                name="paymentMethod"
                value="bit"
                checked={formData.paymentMethod === 'bit'}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="w-5 h-5 accent-brand-gold"
                disabled={isSubmitting}
              />
            </label>
            <label className="flex items-center justify-end gap-3 cursor-pointer bg-brand-dark border border-white/20 rounded-2xl p-4 hover:border-brand-gold transition-all">
              <span className="text-white">אשראי</span>
              <input
                type="radio"
                name="paymentMethod"
                value="credit"
                checked={formData.paymentMethod === 'credit'}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="w-5 h-5 accent-brand-gold"
                disabled={isSubmitting}
              />
            </label>
            <label className="flex items-center justify-end gap-3 cursor-pointer bg-brand-dark border border-white/20 rounded-2xl p-4 hover:border-brand-gold transition-all">
              <span className="text-white">העברה בנקאית</span>
              <input
                type="radio"
                name="paymentMethod"
                value="bank_transfer"
                checked={formData.paymentMethod === 'bank_transfer'}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="w-5 h-5 accent-brand-gold"
                disabled={isSubmitting}
              />
            </label>
          </div>
          {errors.paymentMethod && <p className="text-red-400 text-sm mt-1 text-right">{errors.paymentMethod}</p>}
          {formData.paymentMethod && (
            <div className="mt-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-sm text-blue-300 text-right">
              {formData.paymentMethod === 'bit' && '💳 תקבל הודעת Bit לאחר האישור'}
              {formData.paymentMethod === 'credit' && '💳 פרטי כרטיס האשראי יתבקשו לאחר האישור'}
              {formData.paymentMethod === 'bank_transfer' && '🏦 פרטי העברה בנקאית יישלחו לאחר האישור'}
            </div>
          )}
        </div>

        {/* Notes Field */}
        <div>
          <label htmlFor="notes" className="block text-sm font-bold mb-2 text-right">
            <MessageSquare size={16} className="inline ml-2" />
            הערות / בקשות מיוחדות (אופציונלי)
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="w-full bg-brand-dark border border-white/20 rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-right resize-none"
            placeholder="לדוגמה: אלרגיות, דרישות תזונה מיוחדות..."
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        {/* Terms & Conditions */}
        <div dir="rtl">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.agreeToTerms}
              onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
              className="w-5 h-5 accent-brand-gold flex-shrink-0"
              disabled={isSubmitting}
            />
            <span className={`text-sm text-right ${errors.agreeToTerms ? 'text-red-400' : 'text-gray-300'}`}>
              אני מאשר/ת את <a 
                href="/terms" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-gold underline hover:text-brand-gold/80"
                onClick={(e) => {
                  e.preventDefault();
                  window.open('/terms', '_blank');
                }}
              >תנאי השימוש והתקנון</a> (כולל מדיניות הביטולים) <span className="text-red-400">*</span>
            </span>
          </label>
          {errors.agreeToTerms && <p className="text-red-400 text-sm mt-1 text-right">{errors.agreeToTerms}</p>}
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 text-red-400 text-center">
            {submitError}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || availableDates.length === 0}
          className="w-full bg-brand-gold text-brand-dark py-5 rounded-full font-black text-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSubmitting ? 'שולח הזמנה...' : 'שלח הזמנה'}
        </button>

        <button
          type="button"
          onClick={() => {
            window.history.pushState({}, '', '/');
            window.location.href = '/';
          }}
          className="w-full bg-transparent border-2 border-white/20 text-white py-4 rounded-full font-bold text-lg hover:border-brand-gold hover:text-brand-gold transition-all"
        >
          ביטול וחזרה לדף הראשי
        </button>

        <p className="text-center text-sm text-gray-400">
          לאחר שליחת ההזמנה תקבל אישור במייל
        </p>

        {/* Contact Information */}
        <div className="bg-brand-dark-lighter border border-brand-gold/30 rounded-3xl p-6 mt-8">
          <h3 className="text-lg font-bold text-brand-gold text-center mb-4">
            לשאלות ובירורים:
          </h3>
          <div className="space-y-3 text-center">
            <div>
              <p className="text-white font-bold text-lg">חיליק רוזנברג</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <a 
                href="tel:0505804367" 
                className="text-brand-gold hover:text-brand-gold/80 font-bold text-xl transition-colors"
                dir="ltr"
              >
                050-580-4367
              </a>
              <Phone size={20} className="text-brand-gold" />
            </div>
            <div>
              <a 
                href="https://wa.me/972505804367" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-green-700 transition-all"
              >
                <MessageSquare size={18} />
                <span>שלח הודעת WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;
