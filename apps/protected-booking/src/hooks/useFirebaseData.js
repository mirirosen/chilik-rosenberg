import { IS_PREPROD } from '../utils/preview';
import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db, APP_ID } from '../utils/firebase';
import { DEMO_CHANGED, getDemoAvailability } from '../utils/demoBookingService';
import { serverAvailabilityEnabled, getServerAvailability, freshAvailabilityRow } from '../utils/calendarAvailability';

/**
 * Hook to fetch and subscribe to Firebase cloud data
 * Includes global settings and tour-specific capacity settings
 */
export const useFirebaseData = ({ admin = false } = {}) => {
  // Admin settings still subscribe to their existing authorized Firestore docs.
  // Public callers use the sanitized server projection without a legacy fallback.
  const useServerAvailability = serverAvailabilityEnabled && !admin;
  const [cloudData, setCloudData] = useState(null);
  const [tourDatesData, setTourDatesData] = useState({});
  const [settingsStatus, setSettingsStatus] = useState('loading');
  const [toursStatus, setToursStatus] = useState('loading');
  const [serverData, setServerData] = useState({ availabilityStatus: 'loading', serverAvailabilityEnabled: true, tourDates: {} });
  useEffect(() => {
    if (!useServerAvailability) return;
    let stopped = false, controller, expiryTimer, generation = 0;
    const refresh = async () => {
      const attempt = ++generation;
      controller?.abort(); controller = new AbortController();
      try {
        const data = await getServerAvailability({ signal: controller.signal });
        if (stopped || attempt !== generation) return;
        setServerData(data); clearTimeout(expiryTimer);
        expiryTimer = setTimeout(() => { if (!stopped) setServerData({ availabilityStatus: 'error', serverAvailabilityEnabled: true, tourDates: {} }); }, Math.max(0, data.validUntilMs - Date.now()));
      } catch { if (!stopped && attempt === generation) setServerData({ availabilityStatus: 'error', serverAvailabilityEnabled: true, tourDates: {} }); }
    };
    refresh(); const poll = setInterval(refresh, 30000);
    return () => { stopped = true; controller?.abort(); clearInterval(poll); clearTimeout(expiryTimer); };
  }, [useServerAvailability]);
  const [demoAvailability, setDemoAvailability] = useState(() => {
    if (!IS_PREPROD) return null;
    try { return getDemoAvailability(); } catch { return { availabilityStatus: 'error', tourDates: {} }; }
  });
  useEffect(() => {
    if (!IS_PREPROD) return;
    const refresh = () => { try { setDemoAvailability(getDemoAvailability()); } catch { setDemoAvailability({ availabilityStatus: 'error', tourDates: {} }); } };
    window.addEventListener(DEMO_CHANGED, refresh);
    return () => window.removeEventListener(DEMO_CHANGED, refresh);
  }, []);

  // Subscribe to global settings
  useEffect(() => {
    if (IS_PREPROD || useServerAvailability) return;
    if (!db) {
      setSettingsStatus('error');
      return;
    }

    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings', 'global');

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        setSettingsStatus('ready');
        if (snapshot.exists()) {
          const data = snapshot.data();
          // Ensure globalMaxParticipants has a default value
          setCloudData({
            blocked: data.blocked || [],
            soldOut: data.soldOut || [],
            globalMaxParticipants: data.globalMaxParticipants || 30,
            ...data
          });
        } else {
          setCloudData({ blocked: [], soldOut: [], globalMaxParticipants: 30 });
        }
      },
      (error) => {
        console.error('Firebase snapshot error:', error);
        setSettingsStatus('error');
      }
    );

    return () => unsubscribe();
  }, [useServerAvailability]);

  // Subscribe to tour dates collection for capacity data
  useEffect(() => {
    if (IS_PREPROD || useServerAvailability) return;
    if (!db) {
      setToursStatus('error');
      return;
    }

    const collectionRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'tourDates');

    const unsubscribe = onSnapshot(
      collectionRef,
      (snapshot) => {
        setToursStatus('ready');
        const tourDates = {};
        snapshot.forEach((doc) => {
          tourDates[doc.id] = {
            ...doc.data(),
            // Ensure default values
            useGlobalMax: doc.data().useGlobalMax !== false, // default true
            customMax: doc.data().customMax || null,
            currentRegistrations: doc.data().currentRegistrations || 0,
          };
        });
        setTourDatesData(tourDates);
      },
      (error) => {
        console.error('Firebase tourDates snapshot error:', error);
        setToursStatus('error');
      }
    );

    return () => unsubscribe();
  }, [useServerAvailability]);

  // Never turn unavailable or partially loaded data into advertised empty seats.
  const availabilityStatus = [settingsStatus, toursStatus].includes('error') ? 'error'
    : settingsStatus === 'ready' && toursStatus === 'ready' ? 'ready' : 'loading';
  if (IS_PREPROD) return demoAvailability;
  if (useServerAvailability) return serverData;
  return availabilityStatus === 'ready'
    ? { ...cloudData, tourDates: tourDatesData, availabilityStatus }
    : { availabilityStatus, tourDates: {} };
};

/**
 * Helper function to get effective max participants for a tour
 * @param {Object} cloudData - Data from useFirebaseData hook
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {number} Effective max participants
 */
export const getEffectiveMax = (cloudData, dateStr) => {
  if (cloudData?.serverAvailabilityEnabled) return freshAvailabilityRow(cloudData, dateStr)?.maxParticipants ?? 30;
  if (!cloudData) return 30;

  const tourData = cloudData.tourDates?.[dateStr];
  const globalMax = cloudData.globalMaxParticipants || 30;

  if (!tourData || tourData.useGlobalMax) {
    return globalMax;
  }

  return tourData.customMax || globalMax;
};

/**
 * Helper function to get current registrations for a tour
 * @param {Object} cloudData - Data from useFirebaseData hook
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {number} Current number of registrations
 */
export const getCurrentRegistrations = (cloudData, dateStr) => {
  if (cloudData?.serverAvailabilityEnabled) {
    const row = freshAvailabilityRow(cloudData, dateStr);
    return row ? row.maxParticipants - row.availableSpots : 30;
  }
  if (!cloudData) return 0;
  return cloudData.tourDates?.[dateStr]?.currentRegistrations || 0;
};

/**
 * Helper function to get available spots for a tour
 * @param {Object} cloudData - Data from useFirebaseData hook
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {number} Available spots
 */
export const getAvailableSpots = (cloudData, dateStr) => {
  if (cloudData?.serverAvailabilityEnabled) return freshAvailabilityRow(cloudData, dateStr)?.availableSpots ?? 0;
  if (cloudData?.availabilityStatus && cloudData.availabilityStatus !== 'ready') return 0;
  const max = getEffectiveMax(cloudData, dateStr);
  const current = getCurrentRegistrations(cloudData, dateStr);
  return Math.max(0, max - current);
};

/**
 * Helper function to check if a tour uses global max
 * @param {Object} cloudData - Data from useFirebaseData hook
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {boolean} True if using global max
 */
export const usesGlobalMax = (cloudData, dateStr) => {
  if (!cloudData) return true;
  const tourData = cloudData.tourDates?.[dateStr];
  return !tourData || tourData.useGlobalMax !== false;
};
