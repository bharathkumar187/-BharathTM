"""
Rajakaliamman Temple — Pooja Application backend
Flask + MongoDB (PyMongo)

Run with:
    python app.py

Endpoints:
    GET  /api/health            -> backend + DB status
    POST /api/bookings          -> create a new pooja booking
    GET  /api/bookings          -> list all bookings (newest first)
    GET  /api/bookings/<id>     -> fetch a single booking by its id
"""

import os
from datetime import datetime, date

from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import PyMongoError

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "temple_db")

app = Flask(__name__)
CORS(app)  # allow the frontend (served from file:// or a different port) to call this API

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
bookings_collection = db["bookings"]

REQUIRED_FIELDS = [
    "pooja_name",
    "amount",
    "devotee_name",
    "nakshatram",
    "gothram",
    "ceremony_date",
]


def serialize_booking(doc):
    """Convert a MongoDB document into JSON-friendly types."""
    doc = dict(doc)
    doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


@app.route("/api/health", methods=["GET"])
def health():
    try:
        client.admin.command("ping")
        db_status = "connected"
    except PyMongoError:
        db_status = "unreachable"
    return jsonify({"status": "ok", "database": db_status}), 200


@app.route("/api/bookings", methods=["POST"])
def create_booking():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "error": "Request body must be JSON."}), 400

    missing = [field for field in REQUIRED_FIELDS if not str(data.get(field, "")).strip()]
    if missing:
        return jsonify({
            "success": False,
            "error": f"Missing required field(s): {', '.join(missing)}"
        }), 400

    try:
        amount = float(data["amount"])
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "amount must be a number."}), 400

    try:
        ceremony_date = datetime.strptime(data["ceremony_date"], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"success": False, "error": "ceremony_date must be in YYYY-MM-DD format."}), 400

    if ceremony_date < date.today():
        return jsonify({"success": False, "error": "ceremony_date cannot be in the past."}), 400

    booking = {
        "pooja_name": data["pooja_name"].strip(),
        "amount": amount,
        "devotee_name": data["devotee_name"].strip(),
        "nakshatram": data["nakshatram"].strip(),
        "gothram": data["gothram"].strip(),
        "ceremony_date": data["ceremony_date"],
        "status": "pending",
        "created_at": datetime.utcnow(),
    }

    try:
        result = bookings_collection.insert_one(booking)
    except PyMongoError as exc:
        return jsonify({"success": False, "error": f"Database error: {exc}"}), 500

    booking["_id"] = result.inserted_id
    return jsonify({
        "success": True,
        "booking_id": str(result.inserted_id),
        "data": serialize_booking(booking),
    }), 201


@app.route("/api/bookings", methods=["GET"])
def list_bookings():
    try:
        docs = bookings_collection.find().sort("created_at", -1)
        return jsonify({"success": True, "bookings": [serialize_booking(d) for d in docs]}), 200
    except PyMongoError as exc:
        return jsonify({"success": False, "error": f"Database error: {exc}"}), 500


@app.route("/api/bookings/<booking_id>", methods=["GET"])
def get_booking(booking_id):
    try:
        oid = ObjectId(booking_id)
    except InvalidId:
        return jsonify({"success": False, "error": "Invalid booking id."}), 400

    doc = bookings_collection.find_one({"_id": oid})
    if not doc:
        return jsonify({"success": False, "error": "Booking not found."}), 404

    return jsonify({"success": True, "data": serialize_booking(doc)}), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)
