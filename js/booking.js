// js/booking.js

const BASE_URL = "https://maelcutz.onrender.com";

window.addEventListener("DOMContentLoaded", async () => {
    const table = document.getElementById("time-slot-table");
    const hiddenInput = document.getElementById("appointment-time-hidden");

    try {
        const res = await fetch(`${BASE_URL}/availability`);
        const data = await res.json();

        if (!data.availableSlots.length) {
            table.innerHTML = `<p style="color: white;">No available time slots.</p>`;
            return;
        }

        // Group slots by date
        const slotMap = new Map();
        const now = new Date();
        data.availableSlots.forEach(slot => {
            // don't include slots in the past
            const start = new Date(slot.start);
            const end = new Date(slot.end);
            if (end < now) return;

            const dateKey = new Date(slot.start).toDateString(); // e.g. "Sun Jul 27 2025"
            if (!slotMap.has(dateKey)) slotMap.set(dateKey, []);
            slotMap.get(dateKey).push(slot);
        });

        document.querySelectorAll(".slot-card:not(.unavailable)").forEach(card => {
            card.addEventListener("click", () => {
                // Remove "selected" class from all cards
                document.querySelectorAll(".slot-card").forEach(c => c.classList.remove("selected"));
            
                // Add "selected" class to clicked card
                card.classList.add("selected");
            
                // Set hidden input value to selected time
                const selectedTime = card.getAttribute("data-start");
                document.getElementById("appointment-time-hidden").value = selectedTime;
            
                console.log("📅 Selected appointment time:", selectedTime);
            });
        });

        // Get today/tomorrow info
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Sort keys and slice only the first 7
        const sortedDates = Array.from(slotMap.keys())
            .sort((a, b) => new Date(a) - new Date(b))
            .slice(0, 7);

        sortedDates.forEach((dateKey, idx) => {
            const column = document.createElement("div");
            column.className = "time-slot-column";

            const label = (date => {
            if (date.toDateString() === today.toDateString()) return `Today<br>${formatDate(date)}`;
            if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow<br>${formatDate(date)}`;
            return formatDate(date);
            })(new Date(dateKey));

            const header = document.createElement("h3");
            header.innerHTML = label;
            column.appendChild(header);

            slotMap.get(dateKey).forEach(slot => {
            const card = document.createElement("div");
            card.className = "slot-card";

            const start = new Date(slot.start);
            const end = new Date(slot.end);

            card.textContent = `${formatTime(start)} – ${formatTime(end)}`;
            card.dataset.start = slot.start;

            card.addEventListener("click", () => {
                // Deselect others
                document.querySelectorAll(".slot-card.selected").forEach(el => el.classList.remove("selected"));
                card.classList.add("selected");
                hiddenInput.value = slot.start;
            });

            column.appendChild(card);
            });

            table.appendChild(column);
        });

    } catch (err) {
        console.error("Error loading time slots:", err);
        table.innerHTML = `<p style="color: white;">Error loading times</p>`;
    }

    function formatDate(date) {
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
});



document.getElementById("booking-form").addEventListener("submit", async (e) => {
    console.log("📨 Submitting form...");

    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const haircutType = document.getElementById("haircut-type").value;
    const referral = document.getElementById("referral").value;
    const notes = document.getElementById("notes").value.trim();
    const appointmentTime = document.getElementById("appointment-time-hidden").value;

    // Quick validation (all required fields)
    if (!name || !email || !haircutType || !referral || !appointmentTime) {
    alert("Please fill out all required fields and select a time.");
    return;
    }

    try {
        const response = await fetch(`${BASE_URL}/book`, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({
        name,
        email,
        haircutType,
        referral,
        notes,
        appointmentTime,
        }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
        // Redirect to thank you page
        window.location.href = "thankyou.html";
    } else {
        alert(data.error || "There was a problem scheduling your appointment.");
    }
    } catch (error) {
    console.error("Error submitting form:", error);
    alert("Something went wrong. Please try again later.");
    }
});
