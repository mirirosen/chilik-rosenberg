import { IS_PREPROD } from '../utils/preview';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFirebaseData, getEffectiveMax, getCurrentRegistrations, getAvailableSpots } from '../hooks/useFirebaseData';
import { getUpcomingThursdays, formatDateHebrew, isThursday, getJerusalemDateString, isSelectableTourDate } from '../utils/dateUtils';
import { freshAvailabilityRow } from '../utils/calendarAvailability';
import { createBooking, createCreditPayment, getPaymentStatus, makeIdempotencyKey } from '../utils/paymentService';
import { paymentReturnView, validBookingReference, bookingErrorKey } from '../utils/paymentState';
import { demoBookingApi, getDemoBooking } from '../utils/demoBookingService';
import { DemoBookingNotice, DemoBookingControls, DemoCheckout } from './DemoBookingControls';
import { Users, Phone, Mail, MessageSquare, Calendar, Plus, Minus, Lock, CheckCircle } from '../utils/icons';

const PRICE_PER_PERSON = 250;

const BookingForm = ({ onSuccess, statusBookingId, initialDraft, onChangeSelection, onPaymentRedirect = url => window.location.assign(url) }) => {
  const { t, i18n } = useTranslation();

  // Get pre-filled data from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const prefilledDate = urlParams.get('date');
  const prefilledParticipants = urlParams.get('participants');
  const paymentResult = urlParams.get('payment') || (statusBookingId ? 'status' : null);
  const paymentBookingId = statusBookingId || urlParams.get('id');
  const demoCheckoutId = IS_PREPROD ? urlParams.get('demoCheckout') : null;
  const bookingApi = IS_PREPROD ? demoBookingApi : { createBooking, createCreditPayment, getPaymentStatus, makeIdempotencyKey };

  // Determine if fields should be locked
  const isDateLocked = !!prefilledDate;
  const isParticipantsLocked = !!prefilledParticipants;

  const [formData, setFormData] = useState(() => ({
    name: '',
    phone: '',
    email: '',
    notes: '',
    howDidYouHear: '',
    dateOfBirth: '',
    paymentMethod: '',
    ...(!paymentResult && !demoCheckoutId ? initialDraft : null),
    participants: prefilledParticipants ? Number(prefilledParticipants) : 1,
    tourDate: prefilledDate || '',
    // A changed selection needs fresh consent; never restore it from a draft.
    agreeToTerms: false
  }));

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const submittedRequest = useRef(null);
  const [submitError, setSubmitError] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const [paymentRedirect, setPaymentRedirect] = useState(false);
  const [paymentReturnState, setPaymentReturnState] = useState(paymentResult ? 'checking' : null);
  const [statusRefresh, setStatusRefresh] = useState(0);

  const cloudData = useFirebaseData();
  const thursdays = useMemo(() => getUpcomingThursdays(12), []);

  // Redirect to date selection if no pre-filled data
  useEffect(() => {
    if (paymentResult || demoCheckoutId) return;
    if (!prefilledDate || !prefilledParticipants) {
      setRedirecting(true);
      // Redirect to homepage date selection
      const timer = setTimeout(() => {
        window.location.href = '/#date-selection';
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [prefilledDate, prefilledParticipants, paymentResult, demoCheckoutId]);

  useEffect(() => {
    if (!paymentResult) return;
    if (!validBookingReference(paymentBookingId)) { setPaymentReturnState('unavailable'); return; }
    setPaymentReturnState('checking');
    let cancelled = false, attempts = 0, timer;
    const controller = new AbortController();
    const check = async () => {
      try {
        const state = await bookingApi.getPaymentStatus(paymentBookingId, { signal: controller.signal });
        if (cancelled) return;
        const view = paymentReturnView(state);
        if (view !== 'pending' || IS_PREPROD) { setPaymentReturnState(view); return; }
        attempts += 1;
        if (attempts < 10) timer = setTimeout(check, 1500);
        else setPaymentReturnState('pending');
      } catch {
        if (!cancelled) setPaymentReturnState('unavailable');
      }
    };
    check();
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [paymentResult, paymentBookingId, statusRefresh]);

  const getDateStatus = (dateStr) => {
    if (!isSelectableTourDate(dateStr)) return { available: false, label: t('bookingSection.dateUnavailable'), availableSpots: 0 };
    if (cloudData?.availabilityStatus !== 'ready') return { available: false, label: t(cloudData?.availabilityStatus === 'error' ? 'common.availabilityUnavailable' : 'common.loading'), availableSpots: 0 };
    if (cloudData.serverAvailabilityEnabled && !freshAvailabilityRow(cloudData, dateStr)?.available) return { available: false, label: t('common.availabilityUnavailable'), availableSpots: 0 };
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
    if (!formData.tourDate || cloudData?.availabilityStatus !== 'ready') return null;

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
    // Availability is authoritative on the server. A retry must reach its
    // original idempotency key even if its own reservation filled the date.
    return isSelectableTourDate(dateStr);
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
    } else if (!validateThursdayDate(formData.tourDate) && submittedRequest.current !== JSON.stringify([formData, i18n.language])) {
      if (!isThursday(formData.tourDate)) {
        newErrors.tourDate = t('booking.validation.thursdayOnly');
      } else {
        newErrors.tourDate = t('booking.validation.dateUnavailable');
      }
    }

    if (!Number.isInteger(formData.participants) || formData.participants < 1 || formData.participants > 20) {
      newErrors.participants = t('booking.validation.participantsRange');
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = t('booking.validation.paymentRequired');
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = t('booking.validation.termsRequired');
    }

    setErrors(newErrors);
    const firstInvalid = Object.keys(newErrors)[0];
    if (firstInvalid) requestAnimationFrame(() => {
      const field = firstInvalid === 'paymentMethod'
        ? document.querySelector('input[name="paymentMethod"]')
        : document.getElementById(firstInvalid);
      field?.focus();
    });
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);

    try {
      const booking = { ...formData, name: formData.name.trim(), phone: formData.phone.trim(), email: formData.email.trim(), participants: Number(formData.participants), notes: formData.notes.trim(), language: i18n.language?.startsWith('en') ? 'en' : 'he' };
      const key = await bookingApi.makeIdempotencyKey(booking);
      // Preserve the key on network timeouts: the server may already have committed.
      if (booking.paymentMethod === 'credit') {
        setPaymentRedirect(true);
        submittedRequest.current = JSON.stringify([formData, i18n.language]);
        const result = await bookingApi.createCreditPayment(booking, key);
        onPaymentRedirect(result.paymentUrl);
        return;
      }
      submittedRequest.current = JSON.stringify([formData, i18n.language]);
      const result = await bookingApi.createBooking(booking, key);
      onSuccess?.({ ...booking, ...result });

    } catch (error) {
      console.error('Error creating booking:', error);
      setPaymentRedirect(false);
      setSubmitError(t(bookingErrorKey(error)));
    } finally {
      submitting.current = false;
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
  const changeSelection = () => {
    if (onChangeSelection) onChangeSelection(formData);
    else window.location.href = '/#date-selection';
  };

  if (demoCheckoutId) return <DemoCheckout bookingId={demoCheckoutId} />;

  if (paymentReturnState) {
    const copy = paymentReturnState === 'unavailable'
      ? { icon: '!', title: t('booking.payment.statusUnavailableTitle'), detail: t('booking.payment.statusUnavailable') }
      : paymentReturnState === 'refundReview'
        ? { icon: '!', title: t('booking.payment.refundReviewTitle'), detail: t('booking.payment.refundReviewDetail') }
      : paymentReturnState === 'review'
      ? { icon: '!', title: t('booking.payment.reviewTitle'), detail: t('booking.payment.reviewDetail') }
      : paymentReturnState === 'confirmed'
      ? { icon: '✓', title: t('booking.payment.confirmedTitle'), detail: t('booking.payment.confirmedDetail') }
      : paymentReturnState === 'cancelled'
      ? { icon: '!', title: t('booking.payment.cancelledTitle'), detail: t('booking.payment.cancelledDetail') }
      : paymentReturnState === 'paid'
      ? { icon: '✓', title: t('booking.payment.paidTitle'), detail: t('booking.payment.paidDetail', { bookingId: paymentBookingId }) }
      : paymentReturnState === 'failed'
        ? { icon: '!', title: t('booking.payment.failedTitle'), detail: t('booking.payment.failedDetail') }
        : paymentReturnState === 'pending'
          ? { icon: '…', title: t('booking.payment.pendingTitle'), detail: t('booking.payment.pendingDetail') }
          : { icon: '…', title: t('booking.payment.checkingTitle'), detail: t('booking.payment.checkingDetail') };
    return <div className="bg-brand-dark-lighter p-8 md:p-12 rounded-5xl border border-white/10 shadow-2xl text-center" role="status" aria-live="polite" dir={i18n.dir()}>
      <div className="text-6xl mb-6">{copy.icon}</div><h2 className="text-2xl font-bold text-white mb-4">{copy.title}</h2>
      <p className="text-gray-300 mb-6">{copy.detail}</p>{validBookingReference(paymentBookingId) && <p className="mb-6 font-mono break-all" dir="ltr">{paymentBookingId}</p>}
      <DemoBookingNotice />
      {IS_PREPROD && validBookingReference(paymentBookingId) && <DemoBookingControls bookingId={paymentBookingId} onChange={() => setStatusRefresh(v => v + 1)} />}
      <div className="flex flex-wrap gap-4 justify-center"><button type="button" className="target-button" disabled={paymentReturnState === 'checking'} onClick={() => setStatusRefresh(v => v + 1)}>{t('booking.payment.refreshStatus')}</button>{IS_PREPROD && ['paid', 'confirmed', 'pending'].includes(paymentReturnState) && <button type="button" className="target-button" onClick={() => { try { onSuccess?.(getDemoBooking(paymentBookingId)); } catch { setPaymentReturnState('unavailable'); } }}>{t('demo.summary')}</button>}<a className="target-button inline-flex" href="/">{t('booking.payment.backHome')}</a></div>
    </div>;
  }

  // Show redirect message if no pre-filled data
  if (redirecting) {
    return (
      <div className="bg-brand-dark-lighter p-8 md:p-12 rounded-5xl border border-white/10 shadow-2xl text-center">
        <div className="text-6xl mb-6">🔄</div>
        <h2 className="text-2xl font-bold text-white mb-4" dir={i18n.dir()}>
          {t('booking.redirectTitle')}
        </h2>
        <p className="text-gray-400 mb-6" dir={i18n.dir()}>
          {t('booking.redirectDetail')}
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
      <DemoBookingNotice onFill={sample => setFormData(previous => ({ ...previous, ...sample }))} />

      {/* Pre-filled Summary Card */}
      {(isDateLocked || isParticipantsLocked) && (
        <div className="bg-brand-gold/10 border-2 border-brand-gold/50 rounded-3xl p-6 mb-8" dir={i18n.dir()}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <CheckCircle size={24} className="text-green-400" />
            <h3 className="text-lg font-bold text-white">{t('booking.selectedDetails')}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isDateLocked && (
              <div className="bg-brand-dark/50 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar size={20} className="text-brand-gold" />
                  <span className="text-sm text-gray-400">{t('booking.form.tourDate')}</span>
                </div>
                <p className="text-xl font-bold text-brand-gold">
                  {isThursday(formData.tourDate) ? (i18n.language?.startsWith('en') ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: 'Asia/Jerusalem' }).format(new Date(`${formData.tourDate}T12:00:00Z`)) : formatDateHebrew(formData.tourDate)) : t('booking.validation.dateUnavailable')}
                </p>
                <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-500">
                  <Lock size={12} />
                  <span>{t('booking.selection.locked')}</span>
                </div>
              </div>
            )}

            {isParticipantsLocked && (
              <div className="bg-brand-dark/50 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users size={20} className="text-brand-gold" />
                  <span className="text-sm text-gray-400">{t('booking.form.participants')}</span>
                </div>
                <p className="text-3xl font-black text-brand-gold">
                  {formData.participants}
                </p>
                <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-500">
                  <Lock size={12} />
                  <span>{t('booking.selection.locked')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Total Price Preview */}
          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <span className="text-gray-400 text-sm">{t('booking.price.total')}: </span>
            <span className="text-2xl font-black text-brand-gold">₪{totalPrice}</span>
          </div>

          {/* Change Selection Button */}
          {isDateLocked && errors.tourDate && <p id="tourDate-error" role="alert" className="text-red-400 text-sm mt-4">{errors.tourDate}</p>}
          <button
            type="button"
            id={isDateLocked ? 'tourDate' : undefined}
            aria-describedby={isDateLocked && errors.tourDate ? 'tourDate-error' : undefined}
            onClick={changeSelection}
            className="w-full mt-4 bg-transparent border border-white/20 text-gray-400 py-2 rounded-full text-sm hover:text-white hover:border-white/40 transition-all"
          >
            {t('booking.selection.change')}
          </button>
        </div>
      )}

      {cloudData?.availabilityStatus !== 'ready' && <p role="status">{t(cloudData?.availabilityStatus === 'error' ? 'common.availabilityUnavailable' : 'common.loading')}</p>}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-bold mb-2 text-right">
            {t('booking.form.fullName')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full bg-brand-dark border ${errors.name ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-right`}
            placeholder={t('booking.form.fullName')}
            disabled={isSubmitting}
          />
          {errors.name && <p id="name-error" className="text-red-400 text-sm mt-1 text-right">{errors.name}</p>}
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
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className={`w-full bg-brand-dark border ${errors.phone ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-right`}
            placeholder="05X-XXXXXXX"
            disabled={isSubmitting}
          />
          {errors.phone && <p id="phone-error" className="text-red-400 text-sm mt-1 text-right">{errors.phone}</p>}
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
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full bg-brand-dark border ${errors.email ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-right`}
            placeholder="example@mail.com"
            disabled={isSubmitting}
            dir="ltr"
          />
          {errors.email && <p id="email-error" className="text-red-400 text-sm mt-1 text-right">{errors.email}</p>}
        </div>

        {/* How Did You Hear About Us */}
        <div>
          <label htmlFor="howDidYouHear" className="block text-sm font-bold mb-2 text-right">
            {t('booking.form.howDidYouHear')} <span className="text-red-400">*</span>
          </label>
          <select
            id="howDidYouHear"
            aria-invalid={!!errors.howDidYouHear}
            aria-describedby={errors.howDidYouHear ? 'howDidYouHear-error' : undefined}
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
          {errors.howDidYouHear && <p id="howDidYouHear-error" className="text-red-400 text-sm mt-1 text-right">{errors.howDidYouHear}</p>}
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-bold mb-2 text-right">
            {t('booking.form.dateOfBirth')} <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            id="dateOfBirth"
            aria-invalid={!!errors.dateOfBirth}
            aria-describedby={errors.dateOfBirth ? 'dateOfBirth-error' : undefined}
            value={formData.dateOfBirth}
            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
            className={`w-full bg-brand-dark border ${errors.dateOfBirth ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-center`}
            style={{ colorScheme: 'dark' }}
            disabled={isSubmitting}
          />
          {errors.dateOfBirth && <p id="dateOfBirth-error" className="text-red-400 text-sm mt-1 text-right">{errors.dateOfBirth}</p>}
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
            aria-invalid={!!errors.tourDate}
            aria-describedby={errors.tourDate ? 'tourDate-error' : undefined}
              value={formData.tourDate}
              onChange={(e) => {
                const selectedDate = e.target.value;
                handleInputChange('tourDate', selectedDate);

                // Validate on change
                if (selectedDate) {
                  if (!isThursday(selectedDate)) {
                    setErrors(prev => ({ ...prev, tourDate: t('booking.validation.thursdayOnly') }));
                  } else if (!validateThursdayDate(selectedDate)) {
                    setErrors(prev => ({ ...prev, tourDate: t('booking.validation.dateUnavailable') }));
                  }
                }
              }}
              min={getJerusalemDateString()}
              className={`w-full bg-brand-dark border ${errors.tourDate ? 'border-red-500' : 'border-white/20'} rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-center`}
              style={{ colorScheme: 'dark' }}
              disabled={isSubmitting}
            />
            {errors.tourDate && <p id="tourDate-error" className="text-red-400 text-sm mt-1 text-right">{errors.tourDate}</p>}
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
                aria-label={t('bookingSection.decreaseParticipants')}
              >
                <Minus size={20} />
              </button>

              {/* Number Input */}
              <input
                type="number"
                id="participants"
            aria-invalid={!!errors.participants}
            aria-describedby={errors.participants ? 'participants-error' : undefined}
                value={formData.participants}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  const maxAllowed = selectedDateCapacity ? Math.min(20, selectedDateCapacity.available) : 20;

                  if (value >= 1 && value <= maxAllowed) {
                    handleInputChange('participants', value);
                  } else if (value > maxAllowed) {
                    handleInputChange('participants', maxAllowed);
                    if (selectedDateCapacity && selectedDateCapacity.available < 20) {
                    setErrors(prev => ({ ...prev, participants: t('booking.selection.remainingSpots', { count: selectedDateCapacity.available }) }));
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
                aria-label={t('bookingSection.increaseParticipants')}
              >
                <Plus size={20} />
              </button>
            </div>
            {errors.participants && <p id="participants-error" className="text-red-400 text-sm mt-1 text-right">{errors.participants}</p>}
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
          <div id="payment-method-label" className="block text-sm font-bold mb-3 text-right">
            {t('booking.form.paymentMethod')} <span className="text-red-400">*</span>
          </div>
          <div role="radiogroup" aria-labelledby="payment-method-label" aria-invalid={!!errors.paymentMethod} aria-describedby={errors.paymentMethod ? 'paymentMethod-error' : undefined} className="space-y-3">
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
          {errors.paymentMethod && <p id="paymentMethod-error" className="text-red-400 text-sm mt-1 text-right">{errors.paymentMethod}</p>}
        </div>

        {/* Notes Field */}
        <div>
          <label htmlFor="notes" className="block text-sm font-bold mb-2 text-right">
            <MessageSquare size={16} className="inline mr-2" />
            {t('booking.form.notes')}
          </label>
          <textarea
            id="notes"
            maxLength={1000}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="w-full bg-brand-dark border border-white/20 rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-right resize-none"
            placeholder={t('booking.selection.notesPlaceholder')}
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        {/* Terms & Conditions */}
        <div dir={i18n.dir()}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="agreeToTerms"
              aria-invalid={!!errors.agreeToTerms}
              aria-describedby={errors.agreeToTerms ? 'agreeToTerms-error' : undefined}
              checked={formData.agreeToTerms}
              onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
              className="w-5 h-5 accent-brand-gold flex-shrink-0"
              disabled={isSubmitting}
            />
            <span className={`text-sm text-right ${errors.agreeToTerms ? 'text-red-400' : 'text-gray-300'}`}>
              {t('booking.form.agreeToTerms')}{' '}
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
              {' '}<span className="text-red-400">*</span>
            </span>
          </label>
          {errors.agreeToTerms && <p id="agreeToTerms-error" className="text-red-400 text-sm mt-1 text-right">{errors.agreeToTerms}</p>}
        </div>

        {/* Submit Error */}
        {submitError && (
          <div role="alert" className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 text-red-400 text-center">
            {submitError}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand-gold text-brand-dark py-5 rounded-full font-black text-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {paymentRedirect ? t('booking.payment.redirectingToSecure') : isSubmitting ? t('booking.form.submitting') : t('booking.form.submit')}
        </button>

        <button
          type="button"
          onClick={changeSelection}
          className="w-full bg-transparent border-2 border-white/20 text-white py-4 rounded-full font-bold text-lg hover:border-brand-gold hover:text-brand-gold transition-all"
        >
            {t('booking.selection.backToDates')}
        </button>

        <p className="text-center text-sm text-gray-400">
            {t(IS_PREPROD ? 'demo.noMessages' : 'booking.selection.submissionNotice')}
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
                0506724312
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
    </div>
  );
};

export default BookingForm;
