// Rajakaliamman Temple — Pooja Application logic
// Talks to the Flask + MongoDB backend in /backend

// Change this if your backend runs somewhere other than localhost:5000
const API_BASE_URL = "http://127.0.0.1:5000";

const state = {
    pooja: null,   // { name, price }
    devotee: null  // { name, nakshatram, gothram, date }
};

let currentStep = 1;

// ---------- Step 1: Pooja selection ----------

function selectPooja(cardEl) {
    document.querySelectorAll(".pooja-card").forEach((c) => c.classList.remove("selected"));
    cardEl.classList.add("selected");

    const name = cardEl.dataset.pooja;
    const price = Number(cardEl.dataset.price);
    state.pooja = { name, price };

    document.getElementById("selected-pooja-info").textContent = `${name} — RM ${price}`;
    document.getElementById("step1-next").disabled = false;
}

// ---------- Step navigation ----------

function goToStep(step) {
    if (step === 2 && !state.pooja) return; // guard: must pick a pooja first

    if (step === 3) {
        if (!collectDevoteeDetails()) {
            document.getElementById("step2-error").classList.remove("hidden");
            return;
        }
        document.getElementById("step2-error").classList.add("hidden");
        populateSummary();
    }

    for (let i = 1; i <= 4; i++) {
        document.getElementById(`step-${i}`).classList.add("hidden");
    }
    document.getElementById(`step-${step}`).classList.remove("hidden");

    for (let i = 1; i <= 3; i++) {
        const circle = document.getElementById(`step-${i}-circle`);
        circle.classList.remove("step-active", "step-inactive", "step-complete");
        if (i < step) circle.classList.add("step-complete");
        else if (i === step) circle.classList.add("step-active");
        else circle.classList.add("step-inactive");
    }

    currentStep = step;
}

function collectDevoteeDetails() {
    const name = document.getElementById("devotee-name").value.trim();
    const nakshatram = document.getElementById("nakshatram").value;
    const gothram = document.getElementById("gothram").value.trim();
    const date = document.getElementById("pooja-date").value;

    [["devotee-name", name], ["nakshatram", nakshatram], ["gothram", gothram], ["pooja-date", date]]
        .forEach(([id, value]) => {
            document.getElementById(id).classList.toggle("field-invalid", !value);
        });

    if (!name || !nakshatram || !gothram || !date) return false;

    state.devotee = { name, nakshatram, gothram, date };
    return true;
}

function populateSummary() {
    document.getElementById("summary-pooja").textContent = state.pooja.name;
    document.getElementById("summary-price").textContent = `RM ${state.pooja.price}`;
    document.getElementById("summary-name").textContent = state.devotee.name;
    document.getElementById("summary-nakshatram").textContent = state.devotee.nakshatram;
    document.getElementById("summary-gothram").textContent = state.devotee.gothram;
    document.getElementById("summary-date").textContent = formatDate(state.devotee.date);
}

function formatDate(isoDate) {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// ---------- Step 3: Submit to backend ----------

async function submitBooking() {
    const btn = document.getElementById("submit-btn");
    const btnText = document.getElementById("submit-btn-text");
    const spinner = document.getElementById("submit-spinner");
    const errorEl = document.getElementById("step3-error");

    errorEl.classList.add("hidden");
    btn.disabled = true;
    btnText.textContent = "Submitting...";
    spinner.classList.remove("hidden");

    const payload = {
        pooja_name: state.pooja.name,
        amount: state.pooja.price,
        devotee_name: state.devotee.name,
        nakshatram: state.devotee.nakshatram,
        gothram: state.devotee.gothram,
        ceremony_date: state.devotee.date
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/bookings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || "The temple server could not save your application.");
        }

        document.getElementById("booking-ref").textContent = data.booking_id;
        goToStep(4);
    } catch (err) {
        errorEl.textContent = err.message.includes("Failed to fetch")
            ? "Could not reach the backend. Is the Flask server running on " + API_BASE_URL + "?"
            : err.message;
        errorEl.classList.remove("hidden");
    } finally {
        btn.disabled = false;
        btnText.textContent = "Confirm & Submit";
        spinner.classList.add("hidden");
    }
}

// ---------- Reset for a new application ----------

function resetForm() {
    state.pooja = null;
    state.devotee = null;

    document.querySelectorAll(".pooja-card").forEach((c) => c.classList.remove("selected"));
    document.getElementById("selected-pooja-info").textContent = "No Pooja selected";
    document.getElementById("step1-next").disabled = true;

    ["devotee-name", "gothram"].forEach((id) => (document.getElementById(id).value = ""));
    document.getElementById("nakshatram").value = "";
    document.getElementById("pooja-date").value = "";
    document.querySelectorAll(".field-invalid").forEach((el) => el.classList.remove("field-invalid"));

    goToStep(1);
}

// Sensible default: don't let users pick a date in the past
document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("pooja-date");
    if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];
});
