# 📋 Booking System Documentation

## ✅ Phase 1: Complete!

### What's Been Built

1. **Registration Form** (`/booking` route)
   - Name, Phone (Israeli format), Email fields with validation
   - Tour date selection from available Thursdays
   - Number of participants selector (1-20)
   - Special notes/requests textarea
   - Terms & conditions checkbox
   - Real-time price calculation (250 NIS × participants)
   - Form validation with error messages

2. **Firebase Integration**
   - All bookings saved to Firestore `bookings/` collection
   - Real-time data sync
   - Booking ID generation
   - Status tracking (pending/confirmed/cancelled)
   - Payment status tracking (ready for Morning integration)

3. **Confirmation Page**
   - Success message with booking reference number
   - Complete booking details display
   - Contact information
   - Next steps instructions

4. **Admin Panel** (`/admin` → Bookings tab)
   - View all bookings sorted by date
   - Filter by: All / Upcoming / Past tours
   - Stats dashboard (Total, Pending, Confirmed, Revenue)
   - For each booking:
     - Full customer details
     - Tour date and participants
     - Status badge (Pending/Confirmed/Cancelled)
     - Action buttons:
       - ✅ Confirm booking
       - ❌ Cancel booking
       - 🔄 Revert to pending
       - 💬 WhatsApp direct link
   - Real-time updates

5. **Email Notifications** (EmailJS integration)
   - Admin notification when new booking arrives
   - Customer confirmation email with booking details
   - Includes: Booking ID, Date, Participants, Price, Notes

---

## 📂 File Structure

```
src/
├── components/
│   ├── BookingForm.jsx          # Main registration form
│   ├── BookingConfirmation.jsx  # Success/confirmation page
│   ├── AdminBookings.jsx         # Admin bookings management
│   └── Admin.jsx                 # Updated with tabs (Tours/Bookings)
│
├── utils/
│   └── emailService.js           # EmailJS integration
│
└── App.jsx                       # Updated with routing logic
```

---

## 🔄 User Flow

### Customer Journey:
1. Click "הזמינו את מקומכם עכשיו" on homepage
2. Redirected to `/booking`
3. Fill form → Submit
4. Data saved to Firestore
5. Emails sent (admin + customer)
6. Redirected to `/confirmation` page
7. See booking details and reference number

### Admin Journey:
1. Go to `/admin` → Login
2. Click "הזמנות" tab
3. View all bookings with filters
4. Click action buttons to manage status
5. Click WhatsApp button to contact customer

---

## 💾 Firestore Data Structure

### Collection: `bookings/`

```javascript
{
  bookingId: "BK1737489234567",        // Unique ID
  name: "יוסי כהן",                    // Customer name
  phone: "050-1234567",                // Israeli phone
  email: "yossi@example.com",          // Customer email
  participants: 2,                     // Number of people
  tourDate: "2026-01-30",              // ISO date string
  notes: "אלרגיה לאגוזים",            // Optional notes
  totalPrice: 500,                     // 250 × participants
  pricePerPerson: 250,                 // Fixed price
  status: "pending",                   // pending | confirmed | cancelled
  paymentStatus: "pending",            // pending | completed | failed
  paymentMethod: "morning",            // Prepared for Morning API
  morningBookingId: null,              // Will be filled with Morning integration
  createdAt: Timestamp,                // Auto-generated
  updatedAt: Timestamp                 // Auto-updated
}
```

---

## 🔧 Configuration

### 1. EmailJS Setup (Required)

Follow the guide in `EMAILJS_SETUP_GUIDE.md`:
1. Create EmailJS account (free tier: 200 emails/month)
2. Set up email service (Gmail/Outlook)
3. Create 2 templates (Admin + Customer)
4. Get Service ID, Template IDs, and Public Key
5. Update `src/utils/emailService.js` with your credentials

**File to edit:** `src/utils/emailService.js`

Replace these values:
```javascript
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID_ADMIN = 'YOUR_ADMIN_TEMPLATE_ID';
const EMAILJS_TEMPLATE_ID_USER = 'YOUR_USER_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
const admin_email = 'YOUR_ADMIN_EMAIL@example.com';
```

### 2. Admin Password

**File:** `src/components/Admin.jsx` (Line 8)
```javascript
const ADMIN_PASSWORD = "chilik2026"; // Change this!
```

⚠️ **Security Note:** For production, consider:
- Environment variables
- Firebase Authentication
- More secure password hashing

---

## 🚀 Testing

### Test Booking Flow:
1. Start dev server: `npm run dev`
2. Go to `http://localhost:3000`
3. Click "הזמינו את מקומכם עכשיו"
4. Fill out form and submit
5. Check:
   - ✅ Confirmation page appears
   - ✅ Booking saved in Firestore
   - ✅ Emails sent (check spam folder)

### Test Admin Panel:
1. Go to `http://localhost:3000/admin`
2. Login with password
3. Click "הזמנות" tab
4. Verify booking appears
5. Test status change buttons
6. Test WhatsApp button

---

## 📊 Firebase Console

View your bookings in Firebase:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `hilik-rosenberg-ddb9b`
3. Click **Firestore Database**
4. Navigate to `bookings/` collection
5. See all booking documents

---

## 🎯 Next Steps (Phase 2)

### Morning API Integration:
Once you get Morning approval and credentials:

1. **Update `emailService.js`** or create `morningService.js`
2. **Implement:**
   - Create event in Morning
   - Process payment via Morning
   - Get Morning booking ID
   - Update Firestore with Morning data

3. **Update `BookingForm.jsx`:**
   - Add payment step after form submission
   - Redirect to Morning payment page
   - Handle payment callback
   - Update booking status

**Prepared Fields (already in Firestore):**
- `paymentMethod: "morning"`
- `morningBookingId: null`
- `paymentStatus: "pending"`

---

## 🐛 Troubleshooting

### Emails Not Sending?
- Check browser console for errors
- Verify EmailJS credentials in `emailService.js`
- Test templates in EmailJS dashboard
- Check spam folder

### Bookings Not Appearing in Admin?
- Check Firebase Console → Firestore → `bookings/`
- Verify Firebase permissions (anonymous auth enabled)
- Check browser console for errors

### Form Validation Issues?
- Check phone format: `05X-XXXXXXX` or `05XXXXXXXX`
- Email must be valid format
- Tour date must be selected
- Terms checkbox must be checked

---

## 💰 Pricing & Limits

**Current Setup:**
- Price: **250 NIS per person**
- EmailJS Free Tier: **200 emails/month**
- Firebase Free Tier: **50K reads + 20K writes/day**

**To Change Price:**
Edit `src/components/BookingForm.jsx` (Line 8):
```javascript
const PRICE_PER_PERSON = 250; // Change this value
```

---

## 📞 Support

For questions or issues:
- **EmailJS Docs**: https://www.emailjs.com/docs/
- **Firebase Docs**: https://firebase.google.com/docs/firestore
- **Morning API**: (wait for approval and documentation)

---

**Status:** ✅ Phase 1 Complete - Registration system fully functional!  
**Next:** Configure EmailJS and test end-to-end flow.
