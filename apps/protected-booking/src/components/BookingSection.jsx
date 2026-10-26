import { IS_PREPROD } from '../utils/preview';
import { useState, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db, APP_ID } from '../utils/firebase';
import { Utensils, Clock, Users, Calendar, ChevronRight, ChevronLeft, CheckCircle, Minus, Plus, Lock } from '../utils/icons';
import { useFirebaseData, getAvailableSpots } from '../hooks/useFirebaseData';
import { getUpcomingThursdays, isThursday, getNearestThursday, formatDateHebrew, getJerusalemDateString, isSelectableTourDate } from '../utils/dateUtils';
import { serverAvailabilityEnabled, getServerAvailability, freshAvailabilityRow } from '../utils/calendarAvailability';
import { warmPaymentFunctions } from '../utils/paymentWarmup';
import hostPortrait from '../../../../src/assets/hilik-cutout-provided.png';
import './BookingSection.css';

const PRICE_PER_PERSON = 250;
const DATES_PER_PAGE = 6;

// Step 1 of the booking flow: date and participants. The layout matches the live
// booking-screen design (BookingSection.css); availability rules are unchanged.
const BookingSection = ({ onContinue, initialSelection, standalone = false } = {}) => {
  const { t, i18n } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(initialSelection?.date || '');
  const [participants, setParticipants] = useState(initialSelection?.participants || 1);
  const [datePage, setDatePage] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const checking = useRef(false);
  // The picker mounts only on booking intent (scroll-near or CTA on the home page).
  useEffect(() => { warmPaymentFunctions(); }, []);

  const cloudData = useFirebaseData();
  const thursdays = useMemo(() => getUpcomingThursdays(12, i18n.language), [i18n.language]);
  const visibleDates = thursdays.slice(datePage * DATES_PER_PAGE, datePage * DATES_PER_PAGE + DATES_PER_PAGE);
  const fmtDate = (d) => formatDateHebrew(d, i18n.language);
  const dir = i18n.language === 'he' ? 'rtl' : 'ltr';
  // On /booking the picker is the page itself, so it owns the h1.
  const Heading = standalone ? 'h1' : 'h2';

  function getStatus(dateStr, data = cloudData) {
    if (!isSelectableTourDate(dateStr)) return { available: false, text: t('bookingSection.dateUnavailable') };
    if (!data || data.availabilityStatus === 'loading') return { available: false, text: t('common.loading') };
    if (data.availabilityStatus !== 'ready') return { available: false, text: t('common.availabilityUnavailable') };
    if (data.serverAvailabilityEnabled) {
      const row = freshAvailabilityRow(data, dateStr);
      return row?.available
        ? { available: true, spots: row.availableSpots, text: t('bookingSection.available') }
        : { available: false, text: t('common.availabilityUnavailable') };
    }
    if (data.blocked?.includes(dateStr)) return { available: false, text: t('bookingSection.blocked') };
    const spots = getAvailableSpots(data, dateStr);
    if (data.soldOut?.includes(dateStr) || spots <= 0) return { available: false, text: t('bookingSection.soldOut') };
    return { available: true, spots, text: t('bookingSection.available') };
  }

  const status = getStatus(selectedDate);
  const maxParticipants = status.available ? Math.min(20, status.spots) : 20;
  const canContinue = selectedDate && status.available && Number.isInteger(participants) && participants >= 1 && participants <= maxParticipants;

  const selectDate = (dateStr) => {
    setSelectedDate(dateStr);
    setCheckError('');
  };

  // Re-check capacity from fresh data right before leaving the picker.
  async function continueToBooking() {
    if (!canContinue || checking.current) return;
    checking.current = true;
    setIsChecking(true);
    setCheckError('');
    try {
      if (!IS_PREPROD) {
        let fresh;
        if (serverAvailabilityEnabled) fresh = await getServerAvailability();
        else {
          if (!db) throw new Error('availability-unavailable');
          const [tourDoc, globalDoc] = await Promise.all([
            getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tourDates', selectedDate)),
            getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings', 'global')),
          ]);
          if (!globalDoc.exists()) throw new Error('availability-unavailable');
          fresh = { ...globalDoc.data(), availabilityStatus: 'ready', tourDates: { [selectedDate]: tourDoc.data() || {} } };
        }
        const freshStatus = getStatus(selectedDate, fresh);
        if (!freshStatus.available || freshStatus.spots < participants) {
          setCheckError(t('bookingSection.notEnoughSpots', { date: fmtDate(selectedDate), requested: participants, available: freshStatus.spots || 0 }));
          return;
        }
      }
      if (onContinue) onContinue(selectedDate, participants);
      else window.location.assign(`/booking?date=${encodeURIComponent(selectedDate)}&participants=${participants}`);
    } catch {
      setCheckError(t('common.availabilityUnavailable'));
    } finally {
      checking.current = false;
      setIsChecking(false);
    }
  }

  return (
    <section id="date-selection" className="booking-screen" dir={dir} aria-labelledby="inquiry-title">
      <div className="booking-screen__intro">
        <span className="booking-screen__eyebrow">{t('bookingDesign.eyebrow')}</span>
        <Heading id="inquiry-title" tabIndex={-1}>
          {t('bookingDesign.title')}
          <em>{t('bookingDesign.titleAccent')}</em>
        </Heading>
        <p className="booking-screen__description">{t('bookingDesign.description')}</p>
        <div className="booking-screen__host">
          <div className="booking-screen__portrait">
            <img src={hostPortrait} alt="" width="376" height="513" loading="lazy" />
          </div>
          <div>
            <strong>{t('header.titleShort')}</strong>
            <span>{t('bookingDesign.hostNote')}</span>
          </div>
        </div>
        <div className="booking-screen__price">
          <span>{t('bookingDesign.priceLabel')}</span>
          <div>
            <strong><bdi>₪{PRICE_PER_PERSON}</bdi></strong>
            <span>{t('bookingDesign.perGuest')}</span>
          </div>
          <p>{t('bookingDesign.priceIncludes')}</p>
        </div>
        <ul className="booking-screen__highlights">
          <li><Utensils aria-hidden="true" size={19} /><span>{t('bookingDesign.food')}</span></li>
          <li><Clock aria-hidden="true" size={19} /><span>{t('bookingDesign.time')}</span></li>
          <li><Users aria-hidden="true" size={19} /><span>{t('bookingDesign.group')}</span></li>
        </ul>
        <p className="booking-screen__personal">
          {t('bookingDesign.personal')}
          <br />
          <a href="https://wa.me/972506724312" target="_blank" rel="noopener noreferrer">
            {t('bookingDesign.contact')}
            <span aria-hidden="true"> {dir === 'rtl' ? '←' : '→'}</span>
          </a>
        </p>
      </div>

      <div className="booking-screen__panel">
        <ol className="booking-screen__steps" aria-label={t('bookingDesign.steps')}>
          <li aria-current="step"><span>1</span>{t('bookingDesign.select')}</li>
          <li><span>2</span>{t('bookingDesign.details')}</li>
          <li><span>3</span>{t('bookingDesign.payment')}</li>
        </ol>

        <div className="booking-screen__heading">
          <div>
            <h3>{t('bookingDesign.dateTitle')}</h3>
            <p>{t('bookingDesign.dateHint')}</p>
          </div>
          <span className="booking-screen__calendar-icon"><Calendar size={23} aria-hidden="true" /></span>
        </div>

        <div className="booking-screen__date-nav">
          <span>{t('bookingDesign.upcoming')}</span>
          <div>
            <button type="button" disabled={datePage === 0} onClick={() => setDatePage(page => page - 1)} aria-label={t('bookingDesign.previousDates')}>
              <ChevronRight aria-hidden="true" size={18} />
            </button>
            <button type="button" disabled={(datePage + 1) * DATES_PER_PAGE >= thursdays.length} onClick={() => setDatePage(page => page + 1)} aria-label={t('bookingDesign.nextDates')}>
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
          </div>
        </div>

        <div className="booking-screen__dates" dir={dir} aria-label={t('bookingSection.step1Title')}>
          {visibleDates.map((thursday) => {
            const dateStatus = getStatus(thursday.dateStr);
            const selected = selectedDate === thursday.dateStr;
            return (
              <button
                key={thursday.dateStr}
                type="button"
                className={`booking-screen__date date-card${selected ? ' is-selected' : ''}`}
                disabled={!dateStatus.available}
                aria-pressed={selected}
                aria-label={`${t('bookingSection.dateCardLabel', { date: fmtDate(thursday.dateStr) })}, ${dateStatus.text}`}
                onClick={() => selectDate(thursday.dateStr)}
              >
                <span className="booking-screen__day-name">{t('bookingSection.thursday')}</span>
                <strong>{thursday.day}</strong>
                <span>{thursday.month}</span>
                <small><i aria-hidden="true" />{dateStatus.text}</small>
                {selected && <CheckCircle className="booking-screen__selected-mark" aria-hidden="true" size={17} />}
              </button>
            );
          })}
        </div>

        <details className="booking-screen__other-date">
          <summary>{t('bookingDesign.otherDate')}</summary>
          <label>
            {t('bookingSection.selectDate')}
            <input type="date" aria-label={t('bookingSection.selectDate')} min={getJerusalemDateString()} value={selectedDate} onChange={(e) => selectDate(e.target.value)} />
          </label>
        </details>

        {cloudData?.availabilityStatus === 'error' && <p className="booking-screen__error" role="status">{t('common.availabilityUnavailable')}</p>}
        {selectedDate && !status.available && (
          <div className="booking-screen__error" role="status">
            <p>{isThursday(selectedDate) ? status.text : t('bookingSection.thursdaysOnly')}</p>
            {!isThursday(selectedDate) && (
              <button type="button" onClick={() => selectDate(getNearestThursday(selectedDate < getJerusalemDateString() ? getJerusalemDateString() : selectedDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }))}>
                {t('bookingSection.nextThursday')}
              </button>
            )}
          </div>
        )}

        <div className="booking-screen__people">
          <div>
            <h3>{t('bookingDesign.peopleTitle')}</h3>
            <p>{t('bookingDesign.peopleHint')}</p>
          </div>
          <div className="booking-screen__counter">
            <button type="button" aria-label={t('bookingSection.decreaseParticipants')} disabled={participants <= 1} onClick={() => setParticipants(count => Math.max(1, count - 1))}>
              <Minus size={17} aria-hidden="true" />
            </button>
            <input type="number" aria-label={t('bookingSection.step2Title')} value={participants} min="1" max={maxParticipants} onChange={(e) => setParticipants(Math.max(1, Math.min(maxParticipants, parseInt(e.target.value, 10) || 1)))} />
            <button type="button" aria-label={t('bookingSection.increaseParticipants')} disabled={participants >= maxParticipants} onClick={() => setParticipants(count => Math.min(maxParticipants, count + 1))}>
              <Plus size={17} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="booking-screen__summary" aria-live="polite">
          <div>
            <span>{t('bookingSection.totalToPay')}</span>
            <strong><bdi>₪{(participants * PRICE_PER_PERSON).toLocaleString()}</bdi></strong>
          </div>
          <p>{t('bookingSection.perPerson', { count: participants, price: PRICE_PER_PERSON })}</p>
          {selectedDate && status.available && <p className="booking-screen__chosen"><CheckCircle size={15} aria-hidden="true" />{fmtDate(selectedDate)}</p>}
        </div>

        {participants > maxParticipants && <p className="booking-screen__error" role="alert">{t('bookingSection.onlySpotsLeft', { count: maxParticipants })}</p>}
        {checkError && <p className="booking-screen__error" role="alert">{checkError}</p>}

        {selectedDate && status.available ? (
          <button type="button" className="booking-screen__continue" disabled={!canContinue || isChecking} onClick={continueToBooking}>
            {t(isChecking ? 'bookingSection.checkingAvailability' : 'bookingDesign.continue')}
            <span aria-hidden="true">{dir === 'rtl' ? '←' : '→'}</span>
          </button>
        ) : (
          <button className="booking-screen__continue" type="button" disabled>{t('bookingDesign.chooseDate')}</button>
        )}
        <p className="booking-screen__no-charge">{t('bookingDesign.noCharge')}</p>
        <p className="booking-screen__secure"><Lock size={13} aria-hidden="true" />{t('bookingDesign.secureNote')}</p>
      </div>
    </section>
  );
};

export default BookingSection;
