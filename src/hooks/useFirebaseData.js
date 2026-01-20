import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, APP_ID } from '../utils/firebase';

/**
 * Hook to fetch and subscribe to Firebase cloud data
 */
export const useFirebaseData = () => {
  const [cloudData, setCloudData] = useState(null);

  useEffect(() => {
    if (!db) {
      setCloudData({ blocked: [], soldOut: [] });
      return;
    }

    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings', 'global');
    
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setCloudData(snapshot.data());
        } else {
          setCloudData({ blocked: [], soldOut: [] });
        }
      },
      (error) => {
        console.error('Firebase snapshot error:', error);
        setCloudData({ blocked: [], soldOut: [] });
      }
    );

    return () => unsubscribe();
  }, []);

  return cloudData;
};
