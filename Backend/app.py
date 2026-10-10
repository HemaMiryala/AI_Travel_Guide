from flask import Flask, jsonify, request
from flask_cors import CORS
from google import genai
import requests
import tempfile
import base64
import os
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)
load_dotenv()

MURF_API_KEY = os.getenv("MURF_API_KEY")
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

PROMPTS = {
    "Summary": """
You are a professional tourist guide.
Provide a high-level overview of "{place}" in {language}.

Focus on:
- The historical significance
- Why the place is famous
- Key architectural or cultural highlights

Keep the explanation concise, engaging, and easy to follow.
Avoid excessive details and dates.
Limit the response to around 200 words.
s
Respond ONLY in {language}.
""",

    "Detailed": """
You are a professional tourist guide.
Provide a detailed and immersive explanation of "{place}" in {language}.

Cover:
- Historical background and timeline
- Architectural design and unique features
- Cultural importance and notable events
- Interesting facts and visitor insights

Explain concepts clearly and in a storytelling manner.
Include relevant details and examples to create a rich experience.
Limit the response to around 400 words.

Respond ONLY in {language}.
"""
}

def generate_speech(text, voice_id, locale):
    temp_audio = tempfile.NamedTemporaryFile(
        suffix=".mp3",
        delete=False
    )
   
    url = "https://global.api.murf.ai/v1/speech/stream"
    headers = {
        "api-key": MURF_API_KEY,
        "Content-Type": "application/json"
    }
    data = {
    "voice_id": voice_id,
    "text": text,
    "locale": locale,
    "model": "FALCON",
    "format": "MP3",
    "sampleRate": 24000,
    "channelType": "MONO"
    }

    response = requests.post(url, headers=headers, json=data)

    if response.status_code == 200:
        with open(temp_audio.name, "wb") as f:
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    f.write(chunk)
                    # Process chunks in real-time if needed
                    print(f"Received {len(chunk)} bytes")
        print("Audio streaming completed")
    else:
        print(f"Error: {response.status_code}")

    return temp_audio


def generate_description(place, answer_type, language):
    prompt = PROMPTS[answer_type].format(place=place, language=language)
    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt
    )
    return response.text
    
@app.route("/generate-audio-guide", methods=["POST"])
def generate_audio_guide():
    data = request.json
    place = data["place"]
    answer_type = data["answerType"]
    language = data["language"]
    voice_id = data["voiceId"]
    locale = data["locale"]


    text_description = generate_description(place, answer_type, language)
    audio_path = generate_speech(text_description, voice_id, locale)
    audio_bytes = open(audio_path.name, "rb").read()
    encoded_audio = base64.b64encode(audio_bytes).decode("utf-8")

    return {
        "description": text_description,
        "audioBase64": encoded_audio
                }


@app.route("/generate-itinerary", methods=["POST"])
def generate_itinerary():
    data = request.get_json(silent=True) or {}

    destination = data.get("destination", "").strip()
    days = data.get("days", 1)
    budget = data.get("budget", "Flexible")
    interests = data.get("interests", [])
    pace = data.get("pace", "Balanced")

    if not destination:
        return jsonify({"error": "Please enter a destination."}), 400

    try:
        days = int(days)
        if days < 1 or days > 30:
            return jsonify({
                "error": "Trip duration must be between 1 and 30 days."
            }), 400
    except (TypeError, ValueError):
        return jsonify({"error": "Please enter a valid number of days."}), 400

    if isinstance(interests, str):
        interests = [interests]

    if not isinstance(interests, list):
        return jsonify({"error": "Interests must be a list."}), 400

    prompt = f"""
You are a careful travel-planning assistant.

Create a practical {days}-day itinerary for {destination}.

Travel budget: {budget}
Interests: {", ".join(str(item) for item in interests) or "General sightseeing"}
Travel pace: {pace}

Requirements:
- Organize recommendations day by day.
- Suggest suitable attractions for the traveler's interests.
- Explain briefly why each place is worth visiting.
- Include estimated visit durations where reasonable.
- Consider geography and avoid unnecessary backtracking.
- Do not invent exact entry fees, opening hours, or travel times.
- Clearly label costs and details that need verification.
- Do not claim that recommendations have been verified by a human.
- Allow the traveler to review and change the suggested places.
- Mention when local conditions or availability may affect the plan.
- Use clear, readable English.
"""

    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt
        )

        if not response.text:
            return jsonify({
                "error": "Could not generate an itinerary. Please try again."
            }), 502

        return jsonify({
            "destination": destination,
            "days": days,
            "itinerary": response.text
        })

    except Exception as error:
        app.logger.exception("Itinerary generation failed")
        return jsonify({
            "error": "Unable to generate the itinerary right now."
        }), 500



@app.route("/refine-itinerary", methods=["POST"])
def refine_itinerary():
    data = request.get_json(silent=True) or {}

    destination = data.get("destination", "").strip()
    days = data.get("days", 1)
    original_itinerary = data.get("itinerary", "").strip()
    preferences = data.get("preferences", "").strip()

    if not destination or not original_itinerary:
        return jsonify({
            "error": "Destination and itinerary are required."
        }), 400

    if not preferences:
        preferences = "Keep the existing plan, improve its practicality, and retain useful recommendations."

    try:
        prompt = f"""
You are a careful travel-planning assistant.

The traveler requested a {days}-day trip to {destination}.

Here is the current itinerary, which may contain edits made by the traveler:
{original_itinerary}

The traveler's additional instructions:
{preferences}

Create a refined, complete itinerary that:
- Preserves the traveler's requested changes wherever practical.
- Combines their preferences with useful recommendations from the original plan.
- Organizes activities by day in a clear order.
- Avoids unnecessary travel and unrealistic schedules.
- Explains briefly why each recommended place is worth visiting.
- Does not invent exact prices, opening hours, or travel times.
- Clearly identifies details that need verification.
- Returns the complete updated itinerary, not just a list of changes.
- Uses clear, readable English.
"""

        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt
        )

        if not response.text:
            return jsonify({
                "error": "Could not refine the itinerary. Please try again."
            }), 502

        return jsonify({
            "destination": destination,
            "days": days,
            "itinerary": response.text
        })

    except Exception:
        app.logger.exception("Itinerary refinement failed")
        return jsonify({
            "error": "Unable to refine the itinerary right now."
        }), 500

app.run(debug=True)