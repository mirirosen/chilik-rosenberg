import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, increment, updateDoc } from 'firebase/firestore';
import { db, APP_ID } from '../utils/firebase';
import { useFirebaseData, getEffectiveMax, getCurrentRegistrations, getAvailableSpots } from '../hooks/useFirebaseData';
import { getUpcomingThursdays, formatDateHebrew } from '../utils/dateUtils';
// NOTE: Email sending moved to after payment confirmation - see AdminBookings.jsx
// import { sendBookingEmails } from '../utils/emailService';
import { createMorningPayment } from '../services/morningPayment';
import { Users, Phone, Mail, MessageSquare, Calendar, Plus, Minus, Lock, CheckCircle } from '../utils/icons';

const PRICE_PER_PERSON = 250;

// Debug mode - set to true to show debug panel
const DEBUG_MODE = process.env.NODE_ENV === 'development' || true;

// Debug logging helper
const debugLog = (category, message, data = null) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [BookingForm] [${category}]`;

  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
};

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
    paymentMethod: '',
    agreeToTerms: false
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  // Debug state
  const [debugInfo, setDebugInfo] = useState({});
  const [showDebug, setShowDebug] = useState(false);

  const cloudData = useFirebaseData();
  const thursdays = useMemo(() => getUpcomingThursdays(12), []);

  // Environment check logging on mount
  useEffect(() => {
    console.log('='.repeat(60));
    console.log('=== BOOKING FORM ENVIRONMENT CHECK ===');
    console.log('='.repeat(60));
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Firebase DB configured:', !!db);
    console.log('Firebase APP_ID:', APP_ID);
    console.log('Current URL:', window.location.href);
    console.log('URL Params - date:', prefilledDate);
    console.log('URL Params - participants:', prefilledParticipants);
    console.log('Browser:', navigator.userAgent);
    console.log('Timestamp:', new Date().toISOString());
    console.log('DEBUG_MODE:', DEBUG_MODE);
    console.log('='.repeat(60));

    setDebugInfo(prev => ({
      ...prev,
      environment: process.env.NODE_ENV,
      firebaseConfigured: !!db,
      appId: APP_ID,
      url: window.location.href,
      prefilledDate,
      prefilledParticipants,
      initTimestamp: new Date().toISOString()
    }));
  }, [prefilledDate, prefilledParticipants]);

  // Log when cloudData changes
  useEffect(() => {
    if (cloudData) {
      debugLog('DATA', 'Cloud data loaded:', {
        globalMaxParticipants: cloudData.globalMaxParticipants,
        blockedDates: cloudData.blocked?.length || 0,
        soldOutDates: cloudData.soldOut?.length || 0,
        tourDatesCount: Object.keys(cloudData.tourDates || {}).length
      });
    }
  }, [cloudData]);

  // Redirect to date selection if no pre-filled data
  useEffect(() => {
    if (!prefilledDate || !prefilledParticipants) {
      debugLog('REDIRECT', 'Missing prefilled data, redirecting to date selection');
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
      return {
        valid: false,
        message: t('booking.validation.noSpotsAvailable') || 'אין מספיק מקומות פנויים לתאריך זה'
      };
    }

    return { valid: true };
  };

  const validateForm = () => {
    console.log('');
    console.log('=== FORM VALIDATION STARTED ===');
    debugLog('VALIDATE', 'Starting form validation with data:', {
      name: formData.name ? '✓ provided' : '✗ missing',
      phone: formData.phone ? '✓ provided' : '✗ missing',
      email: formData.email ? '✓ provided' : '✗ missing',
      tourDate: formData.tourDate || '✗ missing',
      participants: formData.participants,
      paymentMethod: formData.paymentMethod || '✗ missing',
      howDidYouHear: formData.howDidYouHear || '✗ missing',
      agreeToTerms: formData.agreeToTerms
    });

    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('booking.validation.nameRequired');
      debugLog('VALIDATE', '❌ Name validation failed: empty');
    } else {
      debugLog('VALIDATE', '✅ Name validation passed');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('booking.validation.phoneRequired');
      debugLog('VALIDATE', '❌ Phone validation failed: empty');
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = t('booking.validation.phoneInvalid');
      debugLog('VALIDATE', '❌ Phone validation failed: invalid format', { phone: formData.phone });
    } else {
      debugLog('VALIDATE', '✅ Phone validation passed');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('booking.validation.emailRequired');
      debugLog('VALIDATE', '❌ Email validation failed: empty');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('booking.validation.emailInvalid');
      debugLog('VALIDATE', '❌ Email validation failed: invalid format', { email: formData.email });
    } else {
      debugLog('VALIDATE', '✅ Email validation passed');
    }

    if (!formData.howDidYouHear) {
      newErrors.howDidYouHear = t('booking.validation.howRequired');
      debugLog('VALIDATE', '❌ HowDidYouHear validation failed: empty');
    } else {
      debugLog('VALIDATE', '✅ HowDidYouHear validation passed');
    }

    if (!formData.tourDate) {
      newErrors.tourDate = t('booking.validation.dateRequired');
      debugLog('VALIDATE', '❌ TourDate validation failed: empty');
    } else if (!validateThursdayDate(formData.tourDate)) {
      const date = new Date(formData.tourDate + 'T00:00:00');
      if (date.getDay() !== 4) {
        newErrors.tourDate = t('booking.validation.thursdayOnly');
        debugLog('VALIDATE', '❌ TourDate validation failed: not Thursday', { day: date.getDay() });
      } else {
        newErrors.tourDate = t('booking.validation.dateUnavailable');
        debugLog('VALIDATE', '❌ TourDate validation failed: date unavailable');
      }
    } else {
      debugLog('VALIDATE', '✅ TourDate validation passed');
    }

    if (formData.participants < 1 || formData.participants > 20) {
      newErrors.participants = t('booking.validation.participantsRange');
      debugLog('VALIDATE', '❌ Participants validation failed: out of range', { participants: formData.participants });
    } else {
      debugLog('VALIDATE', '✅ Participants range validation passed');
    }

    // Validate capacity
    if (formData.tourDate && formData.participants) {
      debugLog('VALIDATE', 'Checking capacity...', { date: formData.tourDate, participants: formData.participants });
      const capacityCheck = validateCapacity(formData.tourDate, formData.participants);
      if (!capacityCheck.valid) {
        newErrors.participants = capacityCheck.message;
        debugLog('VALIDATE', '❌ Capacity validation failed:', capacityCheck.message);
      } else {
        debugLog('VALIDATE', '✅ Capacity validation passed');
      }
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = t('booking.validation.paymentRequired');
      debugLog('VALIDATE', '❌ PaymentMethod validation failed: empty');
    } else {
      debugLog('VALIDATE', '✅ PaymentMethod validation passed:', formData.paymentMethod);
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = t('booking.validation.termsRequired');
      debugLog('VALIDATE', '❌ AgreeToTerms validation failed: not checked');
    } else {
      debugLog('VALIDATE', '✅ AgreeToTerms validation passed');
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;

    if (isValid) {
      console.log('=== ✅ FORM VALIDATION PASSED ===');
    } else {
      console.log('=== ❌ FORM VALIDATION FAILED ===');
      console.log('Validation errors:', newErrors);
    }
    console.log('');

    return isValid;
  };

  // Update tour date registration count
  const updateTourRegistrations = async (dateStr, participantCount) => {
    console.log('');
    console.log('=== UPDATING TOUR REGISTRATIONS ===');
    debugLog('REGISTRATIONS', 'Starting registration update:', { dateStr, participantCount });

    if (!db) {
      debugLog('REGISTRATIONS', '❌ Firebase DB not configured');
      return;
    }

    const startTime = performance.now();

    try {
      const tourDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'tourDates', dateStr);
      debugLog('REGISTRATIONS', 'Fetching tour document...');
      const tourDoc = await getDoc(tourDocRef);

      debugLog('REGISTRATIONS', 'Tour document exists:', tourDoc.exists());
      if (tourDoc.exists()) {
        debugLog('REGISTRATIONS', 'Current tour data:', tourDoc.data());
      }

      if (tourDoc.exists()) {
        // Update existing document
        debugLog('REGISTRATIONS', 'Updating existing document with increment:', participantCount);
        await setDoc(tourDocRef, {
          currentRegistrations: increment(participantCount)
        }, { merge: true });
        debugLog('REGISTRATIONS', '✅ Document updated');
      } else {
        // Create new document with default values
        debugLog('REGISTRATIONS', 'Creating new document with initial count:', participantCount);
        await setDoc(tourDocRef, {
          date: dateStr,
          useGlobalMax: true,
          customMax: null,
          currentRegistrations: participantCount
        });
        debugLog('REGISTRATIONS', '✅ New document created');
      }

      // Check if tour is now full and auto-mark as sold out
      const globalMax = cloudData?.globalMaxParticipants || 30;
      const tourData = tourDoc.exists() ? tourDoc.data() : { useGlobalMax: true, currentRegistrations: 0 };
      const effectiveMax = tourData.useGlobalMax ? globalMax : (tourData.customMax || globalMax);
      const newRegistrations = (tourData.currentRegistrations || 0) + participantCount;

      debugLog('REGISTRATIONS', 'Capacity check:', {
        globalMax,
        effectiveMax,
        previousRegistrations: tourData.currentRegistrations || 0,
        newRegistrations,
        isFull: newRegistrations >= effectiveMax
      });

      if (newRegistrations >= effectiveMax) {
        // Auto mark as sold out
        debugLog('REGISTRATIONS', '⚠️ Tour is now FULL - auto-marking as sold out');
        const globalDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings', 'global');
        const currentSoldOut = cloudData?.soldOut || [];

        if (!currentSoldOut.includes(dateStr)) {
          await setDoc(globalDocRef, {
            soldOut: [...currentSoldOut, dateStr]
          }, { merge: true });
          debugLog('REGISTRATIONS', '✅ Tour marked as sold out');
        } else {
          debugLog('REGISTRATIONS', 'Tour already marked as sold out');
        }
      }

      const endTime = performance.now();
      debugLog('REGISTRATIONS', `✅ Registration update complete in ${(endTime - startTime).toFixed(2)}ms`);
      console.log('=== TOUR REGISTRATIONS UPDATED ===');
      console.log('');
    } catch (error) {
      console.error('❌ Error updating tour registrations:', error);
      debugLog('REGISTRATIONS', '❌ ERROR:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    console.log('');
    console.log('='.repeat(60));
    console.log('=== BOOKING FORM SUBMISSION STARTED ===');
    console.log('='.repeat(60));
    console.log('Timestamp:', new Date().toISOString());

    debugLog('SUBMIT', 'Form data:', {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      tourDate: formData.tourDate,
      participants: formData.participants,
      paymentMethod: formData.paymentMethod,
      howDidYouHear: formData.howDidYouHear,
      notes: formData.notes ? 'provided' : 'empty',
      agreeToTerms: formData.agreeToTerms,
      totalPrice: formData.participants * PRICE_PER_PERSON
    });

    // Update debug info
    setDebugInfo(prev => ({
      ...prev,
      lastSubmitAttempt: new Date().toISOString(),
      formData: { ...formData, notes: formData.notes ? '[provided]' : '[empty]' }
    }));

    // Validate form
    debugLog('SUBMIT', 'Running form validation...');
    if (!validateForm()) {
      debugLog('SUBMIT', '❌ Form validation failed - aborting submission');
      setDebugInfo(prev => ({ ...prev, lastError: 'Form validation failed' }));
      return;
    }
    debugLog('SUBMIT', '✅ Form validation passed');

    // Double-check capacity before submitting (in case it changed)
    debugLog('SUBMIT', 'Double-checking capacity...');
    const finalCapacityCheck = validateCapacity(formData.tourDate, formData.participants);
    if (!finalCapacityCheck.valid) {
      debugLog('SUBMIT', '❌ Capacity check failed:', finalCapacityCheck.message);
      setSubmitError(finalCapacityCheck.message);
      setDebugInfo(prev => ({ ...prev, lastError: 'Capacity check failed: ' + finalCapacityCheck.message }));
      return;
    }
    debugLog('SUBMIT', '✅ Capacity check passed');

    setIsSubmitting(true);
    const submitStartTime = performance.now();

    try {
      // Generate booking ID
      const bookingId = `BK${Date.now()}`;
      const totalPrice = formData.participants * PRICE_PER_PERSON;

      debugLog('SUBMIT', 'Generated booking ID:', bookingId);
      debugLog('SUBMIT', 'Total price:', totalPrice);

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
        paymentMethod: 'whatsapp_contact', // Emergency: all bookings via WhatsApp
        totalPrice,
        pricePerPerson: PRICE_PER_PERSON,
        status: 'pending_contact', // pending_contact, confirmed, cancelled
        paymentStatus: 'awaiting_contact', // awaiting_contact, paid, failed
        morningBookingId: null, // Will be filled when Morning API is fixed
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('');
      console.log('=== SAVING TO FIREBASE ===');
      debugLog('FIREBASE', 'Booking data to save:', bookingData);
      debugLog('FIREBASE', 'Collection path: bookings');

      const firebaseStartTime = performance.now();

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'bookings'), bookingData);

      const firebaseEndTime = performance.now();
      const firebaseDuration = (firebaseEndTime - firebaseStartTime).toFixed(2);

      console.log('✅ Booking saved to Firebase');
      debugLog('FIREBASE', `Document saved in ${firebaseDuration}ms`);
      debugLog('FIREBASE', 'Firestore Document ID:', docRef.id);

      setDebugInfo(prev => ({
        ...prev,
        lastBookingId: bookingId,
        firestoreId: docRef.id,
        firebaseSaveTime: firebaseDuration + 'ms'
      }));

      // Update tour date registrations count
      debugLog('SUBMIT', 'Updating tour registrations...');
      await updateTourRegistrations(formData.tourDate, formData.participants);

      // ========================================
      // EMERGENCY WHATSAPP REDIRECT
      // Payment system temporarily disabled - redirect to WhatsApp
      // ========================================

      console.log('');
      console.log('=== EMERGENCY WHATSAPP REDIRECT ===');
      debugLog('PAYMENT', 'Payment method selected:', formData.paymentMethod);
      debugLog('PAYMENT', 'Amount:', totalPrice);
      debugLog('PAYMENT', 'Redirecting to WhatsApp due to payment system issue');

      const submitEndTime = performance.now();
      const totalDuration = (submitEndTime - submitStartTime).toFixed(2);

      console.log('');
      console.log('='.repeat(60));
      console.log('=== ✅ BOOKING SAVED - REDIRECTING TO WHATSAPP ===');
      console.log('='.repeat(60));
      console.log('Booking ID:', bookingId);
      console.log('Firestore ID:', docRef.id);
      console.log('Total Duration:', totalDuration + 'ms');
      console.log('');

      setDebugInfo(prev => ({
        ...prev,
        submissionComplete: true,
        totalDuration: totalDuration + 'ms',
        redirectMethod: 'whatsapp',
      }));

      // Build WhatsApp message with booking details
      const shortBookingId = docRef.id.substring(0, 8);
      const whatsappMessage = encodeURIComponent(
        `שלום! אני מעוניין/ת להירשם לסיור קולינרי\n\n` +
        `📋 פרטי ההזמנה:\n` +
        `שם: ${formData.name}\n` +
        `תאריך סיור: ${formData.tourDate}\n` +
        `מספר משתתפים: ${formData.participants}\n` +
        `סכום: ${totalPrice} ₪\n` +
        `מספר הזמנה: ${shortBookingId}\n\n` +
        `נא לאשר את ההזמנה ולשלוח פרטי תשלום. תודה!`
      );

      debugLog('SUBMIT', 'Opening WhatsApp with message...');

      // Open WhatsApp
      window.location.href = `https://wa.me/972506724312?text=${whatsappMessage}`;
      return; // Stop execution here

      // Call success callback with booking data (only if not redirecting - currently unreachable)
      if (onSuccess) {
        debugLog('SUBMIT', 'Calling onSuccess callback...');
        onSuccess({
          ...bookingData,
          firestoreId: docRef.id,
        });
      }

    } catch (error) {
      console.log('');
      console.log('='.repeat(60));
      console.log('=== ❌ BOOKING SUBMISSION FAILED ===');
      console.log('='.repeat(60));
      console.error('Error details:', error);
      debugLog('ERROR', 'Submission error:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });

      setDebugInfo(prev => ({
        ...prev,
        lastError: error.message,
        errorCode: error.code,
        errorStack: error.stack
      }));

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

      {/* Temporary Payment Issue Notice */}
      <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-6 mb-6" dir="rtl">
        <div className="flex items-center gap-3 mb-3 justify-end">
          <h3 className="text-xl font-bold text-yellow-400">תקלה זמנית במערכת התשלומים</h3>
          <span className="text-3xl">⚠️</span>
        </div>
        <p className="text-white text-right mb-3">
          כרגע ישנה תקלה זמנית במערכת התשלומים האוטומטית.
        </p>
        <p className="text-yellow-300 text-right text-sm">
          לאחר מילוי הטופס, תועבר/י ישירות לוואטסאפ שלנו לסיום ההזמנה ותיאום התשלום.
        </p>
      </div>

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
                    setErrors(prev => ({ ...prev, participants: t('booking.validation.participantsRange') }));
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

        {/* Submit Button - WhatsApp Redirect */}
        <button
          type="submit"
          disabled={isSubmitting || (selectedDateCapacity && selectedDateCapacity.available <= 0)}
          className="w-full bg-green-500 text-white py-5 rounded-full font-black text-xl hover:bg-green-600 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
        >
          {isSubmitting ? (
            'שומר פרטים...'
          ) : (
            <>
              <span className="text-2xl">💬</span>
              <span>שלח הזמנה ופנה לוואטסאפ</span>
            </>
          )}
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
          לאחר שליחת ההזמנה תועבר/י לוואטסאפ לתיאום התשלום
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
                href="tel:0506724312"
                className="text-brand-gold hover:text-brand-gold/80 font-bold text-xl transition-colors"
                dir="ltr"
              >
                050-672-4312
              </a>
              <Phone size={20} className="text-brand-gold" />
            </div>
            <div>
              <a
                href="https://wa.me/972506724312"
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

      {/* Debug Panel - Only visible when DEBUG_MODE is true */}
      {DEBUG_MODE && (
        <>
          {/* Debug Toggle Button */}
          <button
            type="button"
            onClick={() => setShowDebug(!showDebug)}
            className="fixed bottom-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full z-50 text-sm font-bold shadow-lg hover:bg-red-700 transition-all"
          >
            🐛 {showDebug ? 'Hide Debug' : 'Debug'}
          </button>

          {/* Debug Panel */}
          {showDebug && (
            <div className="fixed bottom-16 left-4 bg-gray-900/95 text-white p-4 rounded-lg max-w-md z-50 max-h-[70vh] overflow-auto border border-red-500/50 shadow-xl" dir="ltr">
              <h3 className="font-bold mb-3 text-red-400 flex items-center gap-2">
                🐛 Debug Panel
                <span className="text-xs text-gray-400">BookingForm</span>
              </h3>

              <div className="space-y-3 text-xs font-mono">
                {/* Environment */}
                <div className="bg-gray-800 p-2 rounded">
                  <div className="text-yellow-400 font-bold mb-1">Environment</div>
                  <div>Mode: {debugInfo.environment || 'unknown'}</div>
                  <div>Firebase: {debugInfo.firebaseConfigured ? '✅ Connected' : '❌ Not Connected'}</div>
                  <div>APP_ID: {debugInfo.appId || 'N/A'}</div>
                </div>

                {/* Form State */}
                <div className="bg-gray-800 p-2 rounded">
                  <div className="text-blue-400 font-bold mb-1">Form State</div>
                  <div>Name: {formData.name ? '✅' : '❌'}</div>
                  <div>Email: {formData.email ? '✅' : '❌'}</div>
                  <div>Phone: {formData.phone ? '✅' : '❌'}</div>
                  <div>Date: {formData.tourDate || 'Not selected'}</div>
                  <div>Participants: {formData.participants}</div>
                  <div>Payment: {formData.paymentMethod || 'Not selected'}</div>
                  <div>Terms: {formData.agreeToTerms ? '✅' : '❌'}</div>
                </div>

                {/* Capacity */}
                {selectedDateCapacity && (
                  <div className="bg-gray-800 p-2 rounded">
                    <div className="text-green-400 font-bold mb-1">Capacity</div>
                    <div>Max: {selectedDateCapacity.max}</div>
                    <div>Current: {selectedDateCapacity.current}</div>
                    <div>Available: {selectedDateCapacity.available}</div>
                  </div>
                )}

                {/* Last Submission */}
                {debugInfo.lastSubmitAttempt && (
                  <div className="bg-gray-800 p-2 rounded">
                    <div className="text-purple-400 font-bold mb-1">Last Submission</div>
                    <div>Time: {debugInfo.lastSubmitAttempt}</div>
                    {debugInfo.lastBookingId && <div>Booking ID: {debugInfo.lastBookingId}</div>}
                    {debugInfo.firestoreId && <div>Firestore ID: {debugInfo.firestoreId}</div>}
                    {debugInfo.firebaseSaveTime && <div>Firebase Save: {debugInfo.firebaseSaveTime}</div>}
                    {debugInfo.totalDuration && <div>Total Time: {debugInfo.totalDuration}</div>}
                  </div>
                )}

                {/* Errors */}
                {debugInfo.lastError && (
                  <div className="bg-red-900/50 p-2 rounded border border-red-500">
                    <div className="text-red-400 font-bold mb-1">❌ Last Error</div>
                    <div className="break-all">{debugInfo.lastError}</div>
                    {debugInfo.errorCode && <div>Code: {debugInfo.errorCode}</div>}
                  </div>
                )}

                {/* Email Results */}
                {debugInfo.emailResults && (
                  <div className="bg-gray-800 p-2 rounded">
                    <div className="text-cyan-400 font-bold mb-1">Email Results</div>
                    <div>Admin: {debugInfo.emailResults.admin?.success ? '✅' : '❌'}</div>
                    <div>Customer: {debugInfo.emailResults.customer?.success ? '✅' : '❌'}</div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      console.log('=== MANUAL DEBUG DUMP ===');
                      console.log('Form Data:', formData);
                      console.log('Cloud Data:', cloudData);
                      console.log('Debug Info:', debugInfo);
                      console.log('Errors:', errors);
                      console.log('Selected Date Capacity:', selectedDateCapacity);
                      console.log('=========================');
                    }}
                    className="bg-blue-600 px-3 py-1 rounded text-xs hover:bg-blue-700"
                  >
                    Log State
                  </button>
                  <button
                    type="button"
                    onClick={() => console.clear()}
                    className="bg-gray-600 px-3 py-1 rounded text-xs hover:bg-gray-700"
                  >
                    Clear Console
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebugInfo({})}
                    className="bg-yellow-600 px-3 py-1 rounded text-xs hover:bg-yellow-700"
                  >
                    Reset Debug
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BookingForm;
