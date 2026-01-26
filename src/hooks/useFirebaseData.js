import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db, APP_ID } from '../utils/firebase';

/**
 * Hook to fetch and subscribe to Firebase cloud data
 * Includes global settings and tour-specific capacity settings
 */
export const useFirebaseData = () => {
  const [cloudData, setCloudData] = useState(null);
  const [tourDatesData, setTourDatesData] = useState({});

  // Subscribe to global settings
  useEffect(() => {
    if (!db) {
      setCloudData({ blocked: [], soldOut: [], globalMaxParticipants: 30 });
      return;
    }

    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings', 'global');
    
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
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
        setCloudData({ blocked: [], soldOut: [], globalMaxParticipants: 30 });
      }
    );

    return () => unsubscribe();
  }, []);

  // Subscribe to tour dates collection for capacity data
  useEffect(() => {
    if (!db) {
      setTourDatesData({});
      return;
    }

    const collectionRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'tourDates');
    
    const unsubscribe = onSnapshot(
      collectionRef,
      (snapshot) => {
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
        setTourDatesData({});
      }
    );

    return () => unsubscribe();
  }, []);

  // Return combined data
  return {
    ...cloudData,
    tourDates: tourDatesData,
  };
};

/**
 * Helper function to get effective max participants for a tour
 * @param {Object} cloudData - Data from useFirebaseData hook
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {number} Effective max participants
 */
export const getEffectiveMax = (cloudData, dateStr) => {
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
