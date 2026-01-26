import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db, APP_ID } from '../utils/firebase';
import { useFirebaseData, getEffectiveMax, getCurrentRegistrations, getAvailableSpots } from '../hooks/useFirebaseData';
import { getUpcomingThursdays, formatDateHebrew } from '../utils/dateUtils';
import { sendBookingEmails } from '../utils/emailService';
import { Users, Phone, Mail, MessageSquare, Calendar, Plus, Minus, Lock, CheckCircle } from '../utils/icons';

const PRICE_PER_PERSON = 250;

const BookingForm = ({ onSuccess }) => {
  const { t } = useTranslation();
  
  // Get pre-filled data from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const prefilledDate = urlParams.get('date');
  const prefilledParticipants = urlParams.get('participants');
  
  // Determine if fields should be locked
  const isDateLocked = !!prefilledDate;
  const isParticipantsLocked = !!prefilledParticipants;
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    participants: prefilledParticipants ? parseInt(prefilledParticipants) : 1,
    tourDate: prefilledDate || '',
    notes: '',
    howDidYouHear: '',
    dateOfBirth: '',
    paymentMethod: '',
    agreeToTerms: false
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  const cloudData = useFirebaseData();
  const thursdays = useMemo(() => getUpcomingThursdays(12), []);

  // Redirect to date selection if no pre-filled data
  useEffect(() => {
    if (!prefilledDate || !prefilledParticipants) {
      setRedirecting(true);
      // Redirect to homepage date selection
      setTimeout(() => {
        window.location.href = '/#date-selection';
      }, 1500);
    }
  }, [prefilledDate, prefilledParticipants]);

  const getDateStatus = (dateStr) => {
    if (!cloudData) return { available: true, label: t('common.loading'), availableSpots: 0 };
    if (cloudData.blocked?.includes(dateStr)) return { available: false, label: t('bookingSection.blocked'), availableSpots: 0 };
    if (cloudData.soldOut?.includes(dateStr)) return { available: false, label: t('bookingSection.soldOut'), availableSpots: 0 };
    
    // Check capacity
    const availableSpots = getAvailableSpots(cloudData, dateStr);
    if (availableSpots <= 0) {
      return { available: false, label: t('bookingSection.soldOut'), availableSpots: 0 };
    }
    
    return { available: true, label: t('bookingSection.available'), availableSpots };
  };

  const availableDates = thursdays.filter(t => getDateStatus(t.dateStr).available);

  // Get capacity info for selected date
  const selectedDateCapacity = useMemo(() => {
    if (!formData.tourDate || !cloudData) return null;
    
    const effectiveMax = getEffectiveMax(cloudData, formData.tourDate);
    const currentRegs = getCurrentRegistrations(cloudData, formData.tourDate);
    const available = getAvailableSpots(cloudData, formData.tourDate);
    
    return {
      max: effectiveMax,
      current: currentRegs,
      available: available
    };
  }, [formData.tourDate, cloudData]);

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

  // Validate capacity for the booking
  const validateCapacity = (dateStr, participants) => {
    if (!cloudData) return { valid: true };
    
    const availableSpots = getAvailableSpots(cloudData, dateStr);
    
    if (participants > availableSpots) {
      if (availableSpots <= 0) {
        return { 
          valid: false, 
          message: t('booking.validation.noSpotsAvailable') || 'אין מקומות פנויים לתאריך זה'
        };
      }
      return { 
        valid: false, 
        message: `${t('booking.validation.notEnoughSpots') || 'נותרו רק'} ${availableSpots} ${t('booking.validation.spotsAvailable') || 'מקומות פנויים'}`
      };
    }
    
    return { valid: true };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('booking.validation.nameRequired');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('booking.validation.phoneRequired');
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = t('booking.validation.phoneInvalid');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('booking.validation.emailRequired');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('booking.validation.emailInvalid');
    }

    if (!formData.howDidYouHear) {
      newErrors.howDidYouHear = t('booking.validation.howRequired');
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = t('booking.validation.dobRequired');
    } else {
      const age = validateAge(formData.dateOfBirth);
      if (age < 18) {
        newErrors.dateOfBirth = t('booking.validation.ageRestriction');
      }
    }

    if (!formData.tourDate) {
      newErrors.tourDate = t('booking.validation.dateRequired');
    } else if (!validateThursdayDate(formData.tourDate)) {
      const date = new Date(formData.tourDate + 'T00:00:00');
      if (date.getDay() !== 4) {
        newErrors.tourDate = t('booking.validation.thursdayOnly');
      } else {
        newErrors.tourDate = t('booking.validation.dateUnavailable');
      }
    }

    if (formData.participants < 1 || formData.participants > 20) {
      newErrors.participants = t('booking.validation.participantsRange');
    }

    // Validate capacity
    if (formData.tourDate && formData.participants) {
      const capacityCheck = validateCapacity(formData.tourDate, formData.participants);
      if (!capacityCheck.valid) {
        newErrors.participants = capacityCheck.message;
      }
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = t('booking.validation.paymentRequired');
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = t('booking.validation.termsRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Update tour date registration count
  const updateTourRegistrations = async (dateStr, participantCount) => {
    if (!db) return;
    
    try {
      const tourDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'tourDates', dateStr);
      const tourDoc = await getDoc(tourDocRef);
      
      if (tourDoc.exists()) {
        // Update existing document
        await setDoc(tourDocRef, {
          currentRegistrations: increment(participantCount)
        }, { merge: true });
      } else {
        // Create new document with default values
        await setDoc(tourDocRef, {
          date: dateStr,
          useGlobalMax: true,
          customMax: null,
          currentRegistrations: participantCount
        });
      }
      
      // Check if tour is now full and auto-mark as sold out
      const globalMax = cloudData?.globalMaxParticipants || 30;
      const tourData = tourDoc.exists() ? tourDoc.data() : { useGlobalMax: true, currentRegistrations: 0 };
      const effectiveMax = tourData.useGlobalMax ? globalMax : (tourData.customMax || globalMax);
      const newRegistrations = (tourData.currentRegistrations || 0) + participantCount;
      
      if (newRegistrations >= effectiveMax) {
        // Auto mark as sold out
        const globalDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings', 'global');
        const currentSoldOut = cloudData?.soldOut || [];
        
        if (!currentSoldOut.includes(dateStr)) {
          await setDoc(globalDocRef, {
            soldOut: [...currentSoldOut, dateStr]
          }, { merge: true });
        }
      }
    } catch (error) {
      console.error('Error updating tour registrations:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    // Double-check capacity before submitting (in case it changed)
    const finalCapacityCheck = validateCapacity(formData.tourDate, formData.participants);
    if (!finalCapacityCheck.valid) {
      setSubmitError(finalCapacityCheck.message);
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

      // Update tour date registrations count
      await updateTourRegistrations(formData.tourDate, formData.participants);

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

  // Show redirect message if no pre-filled data
  if (redirecting) {
    return (
      <div className="bg-brand-dark-lighter p-8 md:p-12 rounded-5xl border border-white/10 shadow-2xl text-center">
        <div className="text-6xl mb-6">🔄</div>
        <h2 className="text-2xl font-bold text-white mb-4" dir="rtl">
          מפנה לבחירת תאריך...
        </h2>
        <p className="text-gray-400 mb-6" dir="rtl">
          יש לבחור תאריך ומספר משתתפים לפני מילוי טופס ההרשמה
        </p>
        <div className="animate-spin w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="bg-brand-dark-lighter p-8 md:p-12 rounded-5xl border border-white/10 shadow-2xl">
      <h2 className="text-3xl md:text-5xl font-serif text-brand-gold text-center mb-8 font-bold">
        {t('booking.title')}
      </h2>

      {/* Pre-filled Summary Card */}
      {(isDateLocked || isParticipantsLocked) && (
        <div className="bg-brand-gold/10 border-2 border-brand-gold/50 rounded-3xl p-6 mb-8" dir="rtl">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CheckCircle size={24} className="text-green-400" />
            <h3 className="text-lg font-bold text-white">פרטי ההזמנה שנבחרו</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isDateLocked && (
              <div className="bg-brand-dark/50 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar size={20} className="text-brand-gold" />
                  <span className="text-sm text-gray-400">תאריך הסיור</span>
                </div>
                <p className="text-xl font-bold text-brand-gold">
                  {formatDateHebrew(formData.tourDate)}
                </p>
                <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-500">
                  <Lock size={12} />
                  <span>נעול</span>
                </div>
              </div>
            )}
            
            {isParticipantsLocked && (
              <div className="bg-brand-dark/50 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users size={20} className="text-brand-gold" />
                  <span className="text-sm text-gray-400">מספר משתתפים</span>
                </div>
                <p className="text-3xl font-black text-brand-gold">
                  {formData.participants}
                </p>
                <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-500">
                  <Lock size={12} />
                  <span>נעול</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Total Price Preview */}
          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <span className="text-gray-400 text-sm">סה"כ לתשלום: </span>
            <span className="text-2xl font-black text-brand-gold">₪{totalPrice}</span>
          </div>
          
          {/* Change Selection Button */}
          <button
            type="button"
            onClick={() => {
              window.location.href = '/#date-selection';
            }}
            className="w-full mt-4 bg-transparent border border-white/20 text-gray-400 py-2 rounded-full text-sm hover:text-white hover:border-white/40 transition-all"
          >
            שנה בחירה
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-bold mb-2 text-right">
            {t('booking.form.fullName')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full bg-brand-dark border ${errors.name ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-right`}
            placeholder={t('booking.form.fullName')}
            disabled={isSubmitting}
          />
          {errors.name && <p className="text-red-400 text-sm mt-1 text-right">{errors.name}</p>}
        </div>

        {/* Phone Field */}
        <div>
          <label htmlFor="phone" className="block text-sm font-bold mb-2 text-right">
            <Phone size={16} className="inline mr-2" />
            {t('booking.form.phone')} <span className="text-red-400">*</span>
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
            <Mail size={16} className="inline mr-2" />
            {t('booking.form.email')} <span className="text-red-400">*</span>
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
            {t('booking.form.howDidYouHear')} <span className="text-red-400">*</span>
          </label>
          <select
            id="howDidYouHear"
            value={formData.howDidYouHear}
            onChange={(e) => handleInputChange('howDidYouHear', e.target.value)}
            className={`w-full bg-brand-dark border ${errors.howDidYouHear ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-right`}
            disabled={isSubmitting}
          >
            <option value="">{t('booking.form.howDidYouHear')}</option>
            <option value="friend">{t('booking.howOptions.friend')}</option>
            <option value="google">{t('booking.howOptions.google')}</option>
            <option value="facebook">{t('booking.howOptions.facebook')}</option>
            <option value="instagram">{t('booking.howOptions.instagram')}</option>
            <option value="other">{t('booking.howOptions.other')}</option>
          </select>
          {errors.howDidYouHear && <p className="text-red-400 text-sm mt-1 text-right">{errors.howDidYouHear}</p>}
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-bold mb-2 text-right">
            {t('booking.form.dateOfBirth')} <span className="text-red-400">*</span>
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
          <p className="text-xs text-gray-400 mt-1 text-right">{t('booking.validation.ageRestriction')}</p>
        </div>

        {/* Tour Date - Locked if pre-filled */}
        {!isDateLocked ? (
          <div>
            <label htmlFor="tourDate" className="block text-sm font-bold mb-2 text-right">
              <Calendar size={16} className="inline mr-2" />
              {t('booking.form.tourDate')} <span className="text-red-400">*</span>
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
                    setErrors(prev => ({ ...prev, tourDate: t('booking.validation.thursdayOnly') }));
                  } else if (!validateThursdayDate(selectedDate)) {
                    setErrors(prev => ({ ...prev, tourDate: t('booking.validation.dateUnavailable') }));
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
                💡 {t('booking.validation.thursdayOnly')} {availableDates.length > 0 ? availableDates.slice(0, 3).map(d => formatDateHebrew(d.dateStr)).join(', ') : t('common.loading')}
                {availableDates.length > 3 && '...'}
              </p>
            </div>
          </div>
        ) : (
          // Locked Date Display - Hidden field for form submission
          <input type="hidden" name="tourDate" value={formData.tourDate} />
        )}

        {/* Participants - Locked if pre-filled */}
        {!isParticipantsLocked ? (
          <div>
            <label htmlFor="participants" className="block text-sm font-bold mb-2 text-right">
              <Users size={16} className="inline mr-2" />
              {t('booking.form.participants')} <span className="text-red-400">*</span>
              <span className="text-xs text-gray-400 font-normal ml-2">
                (1-{selectedDateCapacity ? Math.min(20, selectedDateCapacity.available) : 20})
              </span>
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
                  const maxAllowed = selectedDateCapacity ? Math.min(20, selectedDateCapacity.available) : 20;
                  
                  if (value >= 1 && value <= maxAllowed) {
                    handleInputChange('participants', value);
                  } else if (value > maxAllowed) {
                    handleInputChange('participants', maxAllowed);
                    if (selectedDateCapacity && selectedDateCapacity.available < 20) {
                      setErrors(prev => ({ ...prev, participants: `נותרו רק ${selectedDateCapacity.available} מקומות פנויים` }));
                    } else {
                      setErrors(prev => ({ ...prev, participants: t('booking.validation.participantsRange') }));
                    }
                  } else {
                    handleInputChange('participants', 1);
                  }
                }}
                onBlur={(e) => {
                  // Ensure valid value on blur
                  const value = parseInt(e.target.value);
                  const maxAllowed = selectedDateCapacity ? Math.min(20, selectedDateCapacity.available) : 20;
                  
                  if (isNaN(value) || value < 1) {
                    handleInputChange('participants', 1);
                  } else if (value > maxAllowed) {
                    handleInputChange('participants', maxAllowed);
                  }
                }}
                min="1"
                max={selectedDateCapacity ? Math.min(20, selectedDateCapacity.available) : 20}
                className={`flex-1 bg-brand-dark border ${errors.participants ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white text-center text-2xl font-bold outline-none focus:border-brand-gold`}
                style={{ colorScheme: 'dark' }}
                disabled={isSubmitting}
              />

              {/* Increment Button */}
              <button
                type="button"
                onClick={() => {
                  const maxAllowed = selectedDateCapacity ? Math.min(20, selectedDateCapacity.available) : 20;
                  const newValue = Math.min(maxAllowed, parseInt(formData.participants) + 1);
                  handleInputChange('participants', newValue);
                }}
                disabled={isSubmitting || formData.participants >= (selectedDateCapacity ? Math.min(20, selectedDateCapacity.available) : 20)}
                className="bg-brand-dark border border-white/20 text-brand-gold rounded-xl p-4 hover:bg-brand-gold hover:text-brand-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-brand-dark disabled:hover:text-brand-gold"
                aria-label="Increase participants"
              >
                <Plus size={20} />
              </button>
            </div>
            {errors.participants && <p className="text-red-400 text-sm mt-1 text-right">{errors.participants}</p>}
          </div>
        ) : (
          // Locked Participants - Hidden field for form submission
          <input type="hidden" name="participants" value={formData.participants} />
        )}

        {/* Price Display */}
        <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-2xl p-4 text-center">
          <div className="text-sm text-gray-300 mb-1">{t('booking.price.total')}</div>
          <div className="text-3xl font-black text-brand-gold">
            ₪{totalPrice}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {formData.participants} × ₪{PRICE_PER_PERSON} {t('booking.price.perPerson')}
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-bold mb-3 text-right">
            {t('booking.form.paymentMethod')} <span className="text-red-400">*</span>
          </label>
          <div className="space-y-3">
            <label className="flex items-center justify-end gap-3 cursor-pointer bg-brand-dark border border-white/20 rounded-2xl p-4 hover:border-brand-gold transition-all">
              <span className="text-white">{t('booking.paymentMethods.bit')}</span>
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
              <span className="text-white">{t('booking.paymentMethods.credit')}</span>
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
              <span className="text-white">{t('booking.paymentMethods.bankTransfer')}</span>
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
        </div>

        {/* Notes Field */}
        <div>
          <label htmlFor="notes" className="block text-sm font-bold mb-2 text-right">
            <MessageSquare size={16} className="inline mr-2" />
            {t('booking.form.notes')}
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
              {t('booking.form.agreeToTerms').split('תנאי השימוש והתקנון')[0]}
              <a 
                href="/terms" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-gold underline hover:text-brand-gold/80"
                onClick={(e) => {
                  e.preventDefault();
                  window.open('/terms', '_blank');
                }}
              >{t('header.terms')}</a>
              {t('booking.form.agreeToTerms').split('תנאי השימוש והתקנון')[1]} <span className="text-red-400">*</span>
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
          disabled={isSubmitting || (selectedDateCapacity && selectedDateCapacity.available <= 0)}
          className="w-full bg-brand-gold text-brand-dark py-5 rounded-full font-black text-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSubmitting ? t('booking.form.submitting') : t('booking.form.submit')}
        </button>

        <button
          type="button"
          onClick={() => {
            window.location.href = '/#date-selection';
          }}
          className="w-full bg-transparent border-2 border-white/20 text-white py-4 rounded-full font-bold text-lg hover:border-brand-gold hover:text-brand-gold transition-all"
        >
          חזרה לבחירת תאריך
        </button>

        <p className="text-center text-sm text-gray-400">
          לאחר שליחת ההזמנה תקבל אישור במייל
        </p>

        {/* Contact Information */}
        <div className="bg-brand-dark-lighter border border-brand-gold/30 rounded-3xl p-6 mt-8">
          <h3 className="text-lg font-bold text-brand-gold text-center mb-4">
            {t('booking.contact.title')}
          </h3>
          <div className="space-y-3 text-center">
            <div>
              <p className="text-white font-bold text-lg">{t('booking.contact.name')}</p>
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
                <span>{t('booking.contact.whatsapp')}</span>
              </a>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;
