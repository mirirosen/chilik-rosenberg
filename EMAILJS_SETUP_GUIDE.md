# EmailJS Setup Guide

This guide will help you set up EmailJS to send booking confirmation emails.

## 📧 Step 1: Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Click **"Sign Up"** (free account allows 200 emails/month)
3. Verify your email address

---

## 🔧 Step 2: Add Email Service

1. Log in to EmailJS Dashboard
2. Click **"Email Services"** in the left sidebar
3. Click **"Add New Service"**
4. Choose your email provider (Gmail recommended):
   - **Gmail**: Connect your Gmail account
   - **Outlook**: Connect your Outlook account
   - **Other**: Use SMTP settings
5. Click **"Connect Account"** and authorize EmailJS
6. **Copy your Service ID** (looks like: `service_xxxxxxx`)

---

## 📝 Step 3: Create Email Templates

### Template 1: Admin Notification

1. Go to **"Email Templates"** in the sidebar
2. Click **"Create New Template"**
3. **Template Name**: `Admin Booking Notification`
4. **Template Content** (paste this):

```
Subject: הזמנה חדשה - {{customer_name}}

שלום,

התקבלה הזמנה חדשה לסיור!

📋 פרטי ההזמנה:
------------------
מספר הזמנה: {{booking_id}}
שם: {{customer_name}}
טלפון: {{customer_phone}}
אימייל: {{customer_email}}
תאריך הסיור: {{tour_date}}
מספר משתתפים: {{participants}}
סה"כ לתשלום: ₪{{total_price}}

הערות: {{notes}}

---
הודעה זו נשלחה אוטומטית ממערכת ההזמנות
```

5. Click **"Save"**
6. **Copy the Template ID** (looks like: `template_xxxxxxx`)

### Template 2: Customer Confirmation

1. Click **"Create New Template"** again
2. **Template Name**: `Customer Booking Confirmation`
3. **Template Content** (paste this):

```
Subject: אישור הזמנה - חוויית בני ברק עם חיליק רוזנברג

שלום {{customer_name}},

תודה רבה על ההזמנה! 🎉

📋 פרטי ההזמנה שלך:
------------------
מספר הזמנה: {{booking_id}}
תאריך הסיור: {{tour_date}}
מספר משתתפים: {{participants}}
סה"כ לתשלום: ₪{{total_price}}

{{notes}}

---

מה הלאה?
✓ נציג יצור איתך קשר בהקדם לאישור סופי ותשלום
✓ שמור את מספר ההזמנה לצורך בירורים

יש שאלות?
📞 טלפון: 050-580-4367
💬 WhatsApp: wa.me/972505804367

מחכים לראותכם! 😊
חיליק רוזנברג | סיורים קולינריים בני ברק
```

4. Click **"Save"**
5. **Copy the Template ID** (looks like: `template_xxxxxxx`)

---

## 🔑 Step 4: Get Your Public Key

1. Go to **"Account"** in the sidebar
2. Scroll to **"API Keys"** section
3. **Copy your Public Key** (looks like: `xxxxxxxxxxxxxxx`)

---

## 💻 Step 5: Update Your Code

Open `src/utils/emailService.js` and replace:

```javascript
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID'; // Replace with your Service ID
const EMAILJS_TEMPLATE_ID_ADMIN = 'YOUR_ADMIN_TEMPLATE_ID'; // Replace with Admin Template ID
const EMAILJS_TEMPLATE_ID_USER = 'YOUR_USER_TEMPLATE_ID'; // Replace with Customer Template ID
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY'; // Replace with your Public Key
```

**Example:**
```javascript
const EMAILJS_SERVICE_ID = 'service_abc123';
const EMAILJS_TEMPLATE_ID_ADMIN = 'template_admin456';
const EMAILJS_TEMPLATE_ID_USER = 'template_user789';
const EMAILJS_PUBLIC_KEY = 'xyz123456789abc';
```

Also update admin email:
```javascript
admin_email: 'YOUR_ADMIN_EMAIL@example.com', // Replace with your actual email
```

---

## ✅ Step 6: Test

1. Run your dev server: `npm run dev`
2. Go to `http://localhost:3000/booking`
3. Fill out the booking form
4. Submit and check:
   - ✅ Your admin email receives notification
   - ✅ Customer receives confirmation email

---

## 🆓 Free Tier Limits

- **200 emails/month** (free)
- **Upgrade** to Premium for more: $15/month (1,000 emails)

---

## 🚨 Troubleshooting

### Emails Not Sending?

1. **Check Console**: Look for errors in browser console
2. **Verify IDs**: Make sure all IDs are correct in `emailService.js`
3. **Test Template**: Use EmailJS dashboard "Test" button on templates
4. **Gmail Issues**: 
   - Enable "Less secure app access" in Gmail settings
   - Or use App Password if 2FA is enabled

### Emails Going to Spam?

- Ask recipients to mark as "Not Spam"
- Use EmailJS Pro plan for better deliverability
- Consider using a custom domain email

---

## 🎯 Next Steps

After EmailJS is working:
1. ✅ Test booking flow end-to-end
2. ✅ Customize email templates (colors, logos, etc.)
3. ✅ Set up Morning API integration for payments
4. ✅ Deploy to production

---

**Need help?** Contact EmailJS support: https://www.emailjs.com/docs/
