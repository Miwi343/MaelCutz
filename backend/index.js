const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Optional logging
app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
});

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
// Google Calendar Setup
const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3', auth });

// Replace with Mael's calendar email
const MAEL_CALENDAR_ID = 'mep339@cornell.edu';

// Generate 30-minute time slots between 9 AM and 11 PM
function generateTimeSlots(date, durationMinutes = 30) {
    const slots = [];
    const startHour = 9;
    const endHour = 23;

    const start = new Date(date);
    start.setHours(startHour, 0, 0, 0);

    const end = new Date(date);
    end.setHours(endHour, 0, 0, 0);

    while (start < end) {
        const slotStart = new Date(start);
        const slotEnd = new Date(start.getTime() + durationMinutes * 60000);
        slots.push({ start: new Date(slotStart), end: new Date(slotEnd) });
        start.setMinutes(start.getMinutes() + durationMinutes);
    }

    return slots;
}

app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`[${new Date().toISOString()}] IP ${ip} → ${req.method} ${req.url}`);
    next();
});

// Route: GET /availability
app.get('/availability', async (req, res) => {
    console.log("➡️ /availability endpoint hit");
    try {
        const now = new Date();
        const twoWeeksLater = new Date(now);
        twoWeeksLater.setDate(now.getDate() + 14);

        const response = await calendar.freebusy.query({
        requestBody: {
            timeMin: now.toISOString(),
            timeMax: twoWeeksLater.toISOString(),
            timeZone: 'America/New_York',
            items: [{ id: MAEL_CALENDAR_ID }],
        },
        });

        const busyTimes = response.data.calendars[MAEL_CALENDAR_ID].busy;
        const availableSlots = [];

        for (let d = new Date(now); d < twoWeeksLater; d.setDate(d.getDate() + 1)) {
        const currentDate = new Date(d);
        const slots = generateTimeSlots(currentDate, 30);

        for (let slot of slots) {
            const isBusy = busyTimes.some(busy => {
            return (
                new Date(slot.start) < new Date(busy.end) &&
                new Date(slot.end) > new Date(busy.start)
            );
            });

            if (!isBusy) {
            availableSlots.push({
                start: slot.start,
                end: slot.end,
            });
            }
        }
        }

        // filter slots to only include those in the futur
        const upcomingSlots = availableSlots.filter(slot => new Date(slot.end) > now);
        res.json({ availableSlots: upcomingSlots });
    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

app.post('/book', async (req, res) => {
    console.log(`📅 Booking appointment for ${req.body.name || 'Unknown user'}`);
    try {
    const {
        name,
        email,
        haircutType,
        referral,
        notes,
        appointmentTime,
    } = req.body;

    if (!name || !email || !haircutType || !referral || !appointmentTime) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: './config/credentials.json',
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const slotStart = new Date(appointmentTime);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60000); // 30 mins

    // Check if slot is still free
    const busyCheck = await calendar.freebusy.query({
        requestBody: {
        timeMin: slotStart.toISOString(),
        timeMax: slotEnd.toISOString(),
        timeZone: 'America/New_York',
        items: [{ id: MAEL_CALENDAR_ID }],
        },
    });

    const busy = busyCheck.data.calendars[MAEL_CALENDAR_ID].busy;
    if (busy.length > 0) {
        return res.status(409).json({ error: 'Time slot no longer available' });
    }

    // Format event description with all details for Mael
    const description = `
Add this email to invite customer to the event:
${email}

Appointment Details:
Client Name: ${name}
Client Email: ${email}
Haircut Type: ${haircutType}
Referral Source: ${referral}
Notes: ${notes || 'None'}
`.trim();

    const event = {
    summary: `💈 ${name} -> ${haircutType} appointment 💈`,
    description,
    start: {
        dateTime: slotStart.toISOString(),
        timeZone: 'America/New_York',
    },
    end: {
        dateTime: slotEnd.toISOString(),
        timeZone: 'America/New_York',
    },
    reminders: {
        useDefault: true,
    },
    };


    await calendar.events.insert({
        calendarId: MAEL_CALENDAR_ID,
        requestBody: event,
    });

    res.json({ success: true });
    } catch (err) {
    console.error('❌ Error creating appointment:', err);
    res.status(500).json({ error: 'Failed to book appointment' });
    }
});  

// Optional test route
app.get('/', (req, res) => {
    res.send('Hello from Mael Cutzz backend 👋');
});

app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
