import emailjs from '@emailjs/browser';

// EmailJS Configuration
// TODO: Replace these with your actual EmailJS credentials
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID'; // You'll get this from EmailJS
const EMAILJS_TEMPLATE_ID_ADMIN = 'YOUR_ADMIN_TEMPLATE_ID';
const EMAILJS_TEMPLATE_ID_USER = 'YOUR_USER_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';

/**
 * Initialize EmailJS
 */
export const initEmailJS = () => {
  if (EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }
};

/**
 * Send booking confirmation to admin
 */
export const sendAdminNotification = async (bookingData) => {
  try {
    const templateParams = {
      booking_id: bookingData.bookingId,
      customer_name: bookingData.name,
      customer_phone: bookingData.phone,
      customer_email: bookingData.email,
      tour_date: bookingData.tourDate,
      participants: bookingData.participants,
      total_price: bookingData.totalPrice,
      notes: bookingData.notes || 'אין',
      admin_email: 'YOUR_ADMIN_EMAIL@example.com', // TODO: Replace with actual admin email
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID_ADMIN,
      templateParams
    );

    return { success: true, response };
  } catch (error) {
    console.error('Error sending admin email:', error);
    return { success: false, error };
  }
};

/**
 * Send booking confirmation to customer
 */
export const sendCustomerConfirmation = async (bookingData) => {
  try {
    const templateParams = {
      booking_id: bookingData.bookingId,
      customer_name: bookingData.name,
      customer_email: bookingData.email,
      tour_date: bookingData.tourDate,
      participants: bookingData.participants,
      total_price: bookingData.totalPrice,
      notes: bookingData.notes || 'אין',
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID_USER,
      templateParams
    );

    return { success: true, response };
  } catch (error) {
    console.error('Error sending customer email:', error);
    return { success: false, error };
  }
};

/**
 * Send both admin and customer emails
 */
export const sendBookingEmails = async (bookingData) => {
  const results = await Promise.allSettled([
    sendAdminNotification(bookingData),
    sendCustomerConfirmation(bookingData)
  ]);

  return {
    admin: results[0].status === 'fulfilled' ? results[0].value : { success: false },
    customer: results[1].status === 'fulfilled' ? results[1].value : { success: false }
  };
};
