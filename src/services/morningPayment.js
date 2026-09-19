/**
 * Morning (Green Invoice) Payment Service
 *
 * API Documentation: https://www.greeninvoice.co.il/api-docs/
 *
 * This service handles:
 * - Creating payment requests (via Firebase Cloud Function)
 * - Creating invoices
 * - Checking payment status
 *
 * NOTE: All API calls go through Firebase Cloud Functions to avoid CORS issues.
 * The browser cannot call Morning API directly due to CORS restrictions.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase';

// Fallback payment details (when Cloud Function fails)
export const FALLBACK_PAYMENT_INFO = {
  bit: {
    phone: '0505804367',
    name: 'חיליק רוזנברג',
  },
  bankTransfer: {
    bank: 'בנק הפועלים',
    branch: '655',
    account: '72980',
    name: 'חיליק רוזנברג',
  },
};

/**
 * Create a payment document in Morning via Firebase Cloud Function
 * This avoids CORS issues by making the API call server-side
 *
 * @param {Object} bookingData - Booking information
 * @returns {Promise<Object>} - Payment result
 */
export const createMorningPayment = async (bookingData) => {
  console.log('');
  console.log('='.repeat(60));
  console.log('=== MORNING CLOUD FUNCTION: Creating Payment ===');
  console.log('='.repeat(60));
  console.log('Booking data:', {
    bookingId: bookingData.bookingId,
    name: bookingData.name,
    email: bookingData.email,
    phone: bookingData.phone,
    tourDate: bookingData.tourDate,
    participants: bookingData.participants,
    totalPrice: bookingData.totalPrice,
    paymentMethod: bookingData.paymentMethod,
  });

  try {
    // Check if functions is available
    if (!functions) {
      console.error('❌ Firebase Functions not initialized');
      return {
        success: false,
        error: 'Firebase Functions not initialized',
        shouldUseFallback: true,
      };
    }

    // Get reference to the Cloud Function
    console.log('📞 Calling Cloud Function: createMorningPayment...');
    const createPaymentFn = httpsCallable(functions, 'createMorningPayment');

    const startTime = performance.now();

    // Call the Cloud Function
    const result = await createPaymentFn({
      bookingId: bookingData.bookingId,
      name: bookingData.name,
      email: bookingData.email,
      phone: bookingData.phone,
      tourDate: bookingData.tourDate,
      participants: bookingData.participants,
      totalPrice: bookingData.totalPrice,
      pricePerPerson: bookingData.pricePerPerson || 250,
      paymentMethod: bookingData.paymentMethod,
    });

    const endTime = performance.now();
    console.log(`⏱️ Cloud Function took ${(endTime - startTime).toFixed(0)}ms`);
    console.log('📦 Cloud Function result:', result.data);

    if (result.data.success) {
      console.log('✅ Morning payment created successfully via Cloud Function');
      return {
        success: true,
        documentId: result.data.documentId,
        documentNumber: result.data.documentNumber,
        paymentUrl: result.data.paymentUrl,
        pdfUrl: result.data.pdfUrl,
        status: result.data.status,
        data: result.data.data,
      };
    } else {
      console.error('❌ Morning Cloud Function returned error:', result.data.error);
      return {
        success: false,
        error: result.data.error,
        details: result.data.details,
        shouldUseFallback: true,
      };
    }

  } catch (error) {
    console.error('❌ Error calling Morning Cloud Function:', error);

    // Check for specific Firebase errors
    if (error.code === 'functions/not-found') {
      console.error('');
      console.error('🚫 CLOUD FUNCTION NOT DEPLOYED! 🚫');
      console.error('═══════════════════════════════════════════════════════');
      console.error('The createMorningPayment function is not deployed yet.');
      console.error('');
      console.error('To deploy, run:');
      console.error('  cd functions && npm install');
      console.error('  firebase deploy --only functions');
      console.error('═══════════════════════════════════════════════════════');
      console.error('');
    }

    return {
      success: false,
      error: error.message,
      code: error.code,
      shouldUseFallback: true,
    };
  }
};

/**
 * Check payment status for a document via Cloud Function
 * @param {string} documentId - Morning document ID
 * @returns {Promise<Object>} - Payment status
 */
export const checkMorningPaymentStatus = async (documentId) => {
  console.log('=== MORNING CLOUD FUNCTION: Checking Payment Status ===');
  console.log('Document ID:', documentId);

  try {
    if (!functions) {
      console.error('❌ Firebase Functions not initialized');
      return { success: false, error: 'Firebase Functions not initialized' };
    }

    const checkStatusFn = httpsCallable(functions, 'checkMorningPaymentStatus');
    const result = await checkStatusFn({ documentId });

    console.log('Payment status result:', result.data);
    return result.data;

  } catch (error) {
    console.error('❌ Error checking payment status:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Test Morning API connection via Cloud Function
 * @returns {Promise<Object>} - Connection test result
 */
export const testMorningConnection = async () => {
  console.log('=== Testing Morning Connection via Cloud Function ===');

  try {
    if (!functions) {
      console.error('❌ Firebase Functions not initialized');
      return { success: false, error: 'Firebase Functions not initialized' };
    }

    const testConnectionFn = httpsCallable(functions, 'testMorningConnection');
    const result = await testConnectionFn({});

    console.log('Connection test result:', result.data);
    return result.data;

  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a Bit payment link (WhatsApp with payment details)
 * This is a fallback for when Morning API is not available
 *
 * @param {Object} paymentInfo - Payment information
 * @returns {string} - WhatsApp link with payment instructions
 */
export const createBitPaymentLink = (paymentInfo) => {
  const message = encodeURIComponent(
    `שלום, אני רוצה לשלם עבור הזמנה מס' ${paymentInfo.bookingId}\n` +
    `סכום: ${paymentInfo.amount} ₪\n` +
    `תאריך סיור: ${paymentInfo.tourDate}\n` +
    `מספר משתתפים: ${paymentInfo.participants}`
  );

  return `https://wa.me/972505804367?text=${message}`;
};

/**
 * Get status text in Hebrew
 */
export const getStatusText = (status) => {
  const statusMap = {
    0: 'טיוטה',
    1: 'שולם',
    2: 'שולם חלקית',
    3: 'נשלח',
    4: 'איחור בתשלום',
  };
  return statusMap[status] || 'לא ידוע';
};

export default {
  createMorningPayment,
  checkMorningPaymentStatus,
  testMorningConnection,
  createBitPaymentLink,
  getStatusText,
  FALLBACK_PAYMENT_INFO,
};
