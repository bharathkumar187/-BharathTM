# Rajakaliamman Temple — Pooja Application

A 3-step Pooja booking form (select offering → devotee details → summary)
backed by a Python Flask API that saves every application to MongoDB.

## File structure

```
temple-booking/
├── index.html              # Frontend page
├── style.css               # Styles
├── script.js                # Step logic + calls the backend API
└── backend/
    ├── app.py               # Flask API
    ├── requirements.txt
    └── .env.example         # Copy to .env and set your Mongo connection
```

## 1. Set up MongoDB

Pick one:

**Option A — Local MongoDB**
Install MongoDB Community Edition for your OS from mongodb.com, then make
sure the `mongod` service is running (it defaults to `mongodb://localhost:27017/`).

**Option B — MongoDB Atlas (free, no local install)**
1. Create a free cluster at mongodb.com/atlas.
2. Click "Connect" → "Drivers" and copy the connection string
   (looks like `mongodb+srv://user:pass@cluster.../`).
3. You'll paste this into `.env` in the next step.

## 2. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # on Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env if you're using Atlas or a non-default Mongo URI

python app.py
```

The API now runs at `http://127.0.0.1:5000`. You should see a `* Running on
http://127.0.0.1:5000` message. Test it's alive:

```bash
curl http://127.0.0.1:5000/api/health
```

## 3. Open the frontend

Just open `index.html` in your browser (double-click it, or use a tool like
VS Code's "Live Server" extension). It's already configured to talk to
`http://127.0.0.1:5000` — see the `API_BASE_URL` constant at the top of
`script.js` if you ever deploy the backend elsewhere.

## How it works

- **Step 1** — pick a Pooja card (price is stored with it).
- **Step 2** — enter devotee name, Nakshatram, Gothram, and ceremony date.
  All fields are required; the date can't be in the past.
- **Step 3** — review everything, then **Confirm & Submit**. This sends a
  `POST /api/bookings` request to Flask, which validates the data and saves
  it into the `bookings` collection in MongoDB.
- **Step 4** — shows the booking reference (the MongoDB document ID) on success.

## API reference

| Method | Endpoint              | Description                          |
|--------|-----------------------|---------------------------------------|
| GET    | /api/health           | Checks the API and DB connection      |
| POST   | /api/bookings         | Create a booking (JSON body)          |
| GET    | /api/bookings         | List all bookings, newest first       |
| GET    | /api/bookings/<id>    | Get one booking by its Mongo `_id`    |

**POST /api/bookings body:**
```json
{
  "pooja_name": "Maha Abishegam",
  "amount": 251,
  "devotee_name": "Murali Krishna",
  "nakshatram": "Rohini",
  "gothram": "Bharadwaja",
  "ceremony_date": "2026-12-01"
}
```

## Notes / next steps you could add later

- The `status` field on each booking defaults to `"pending"` — you could add
  an admin endpoint to mark bookings `"confirmed"` or `"completed"`.
- CORS is currently wide open (`CORS(app)`) for easy local testing — restrict
  `origins=` to your real domain before deploying publicly.
- No authentication yet — anyone who can reach the API can submit/list
  bookings. Add an API key or login if this goes beyond a personal project.
