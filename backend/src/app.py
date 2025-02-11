from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import yaml, json
import os
from dotenv import load_dotenv
import requests
from src.utils import get_sub, get_subtitle_languages

load_dotenv()
app = Flask(__name__)
CORS(app)


def load_prompt_from_yaml(file_path):
    with open(file_path, "r", encoding="utf8") as file:
        data = yaml.safe_load(file)
    return data


def filter_subtitles(captions, section_id, timestamps):
    sorted_timestamps = sorted([float(t) for t in timestamps])

    if section_id == 0:
        start_interval = float("-inf")
        end_interval = sorted_timestamps[0]
    elif section_id >= len(sorted_timestamps):
        start_interval = sorted_timestamps[-1]
        end_interval = float("inf")
    else:
        start_interval = sorted_timestamps[section_id - 1]
        end_interval = sorted_timestamps[section_id]

    filtered_captions = [
        caption
        for caption in captions
        if start_interval <= float(caption["timestamp_start"]) <= end_interval
    ]

    return [
        {"timestamp_start": c["timestamp_start"], "subtitle": c["subtitle"]}
        for c in filtered_captions
    ]


def use_gemini_api(prompt, config=None, history=None, model="gemini-exp-1206"):
    if config is None:
        config = {}
    if history is None:
        history = []

    api_key = os.getenv("GEMINI_API_KEY")
    base_url = "https://generativelanguage.googleapis.com/v1beta"

    generation_config = {
        "temperature": 1,
        "topP": 0.95,
        "topK": 64,
        "maxOutputTokens": 8192,
        **config,
    }

    payload = {
        "contents": [*history, {"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": generation_config,
    }

    response = requests.post(
        f"{base_url}/models/{model}:generateContent?key={api_key}", json=payload
    )

    if not response.ok:
        raise Exception(f"HTTP error! status: {response.status_code}")

    data = response.json()

    if not data.get("candidates") or not data["candidates"][0].get("content"):
        raise Exception("Invalid response structure from Gemini API")

    generated_text = data["candidates"][0]["content"]["parts"][0]["text"]
    print("Generated text:", generated_text)
    return generated_text


def extract_language_info(json_data):
    language_dict = []
    captions_data = json_data.get("player_response", {}).get("captions", {})
    tracks = captions_data.get("playerCaptionsTracklistRenderer", {}).get(
        "captionTracks", []
    )

    for entry in tracks:
        if entry.get("languageCode") and entry.get("name"):
            language_dict.append(entry["languageCode"])

    return language_dict


# def get_sub(video_id, lang):
#     try:
#         captions = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
#         converted_captions = [
#             {"timestamp_start": item["start"], "subtitle": item["text"]}
#             for item in captions
#         ]
#         return converted_captions
#     except Exception as e:
#         print(f"Error getting subtitles: {e}, {lang}")
#         return None


@app.route("/api", methods=["GET"])
def home():
    return jsonify({"success": True, "message": "Welcome to the API"})


@app.route("/api/subtitles-languages/<video_id>", methods=["GET"])
def get_subtitle_langs(video_id):
    try:
        languages = get_subtitle_languages(video_id)
        return jsonify({"success": True, "data": languages})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/subtitles/<video_id>/<subtitle_id>", methods=["GET"])
def get_subtitles(video_id, subtitle_id):
    try:
        captions = get_sub(video_id, subtitle_id)
        return jsonify({"success": True, "data": captions})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/chat/<video_id>/<subtitle_id>", methods=["POST"])
def chat(video_id, subtitle_id):
    try:
        data = request.get_json()
        message = data.get("message")
        chat_history = data.get("chatHistory", [])

        captions = get_sub(video_id, subtitle_id)
        yaml_file_path = "config/prompt.yaml"
        prompt_data = load_prompt_from_yaml(yaml_file_path)

        context_message = f"""
        ## SYSTEM PROMPT ##
        {prompt_data['chat']['prompt']}
        ## END OF SYSTEM PROMPT ##

        ## CONTEXT OF THE YOUTUBE VIDEO ##
        {str(captions)}
        ## END OF CONTEXT ##

        {message}
        """

        response = use_gemini_api(
            context_message,
            {"responseMimeType": "text/plain"},
            chat_history,
            prompt_data["chat"]["model"],
        )
        return jsonify({"success": True, "data": response})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/chapters/<video_id>/<subtitle_id>", methods=["GET"])
def get_chapters(video_id, subtitle_id):
    try:
        captions = get_sub(video_id, subtitle_id)
        yaml_file_path = "config/prompt.yaml"
        prompt_data = load_prompt_from_yaml(yaml_file_path)

        prompt = f"""
        {prompt_data['chapter']['prompt']}

        ## Video Captions ##
        {str(captions)}
        ## End of Video Captions ##
        """

        response = use_gemini_api(
            prompt,
            {"responseMimeType": "application/json"},
            [],
            prompt_data["chapter"]["model"],
        )
        return jsonify({"success": True, "data": json.loads(response)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/search/<video_id>/<subtitle_id>", methods=["POST"])
def search(video_id, subtitle_id):
    try:
        data = request.get_json()
        query = data.get("query")
        captions = get_sub(video_id, subtitle_id)
        yaml_file_path = "config/prompt.yaml"
        prompt_data = load_prompt_from_yaml(yaml_file_path)

        prompt = f"""
        {prompt_data['search']['prompt']}

        ## Video Captions ##
        {str(captions)}
        ## End of Video Captions ##

        ## User Query ##
        {query}
        ## End of User Query ##
        """

        response = use_gemini_api(
            prompt,
            {"responseMimeType": "application/json"},
            [],
            prompt_data["search"]["model"],
        )
        return jsonify({"success": True, "data": json.loads(response)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/sectionsummary/<video_id>/<subtitle_id>", methods=["POST"])
def section_summary(video_id, subtitle_id):
    try:
        data = request.get_json()
        section_id = data.get("sectionId")
        timestamps = data.get("timestamps")

        captions = get_sub(video_id, subtitle_id)
        filtered_subtitles = filter_subtitles(captions, section_id, timestamps)
        yaml_file_path = "config/prompt.yaml"
        prompt_data = load_prompt_from_yaml(yaml_file_path)

        prompt = f"""
        {prompt_data['sectionsummary']['prompt']}

        ## Video Captions ##
        {str(captions)}
        ## End of Video Captions ##
        
        ## Summary Section ##
        {str(filtered_subtitles)}
        ## End of Summary Section ##
        """

        response = use_gemini_api(
            prompt,
            {"responseMimeType": "text/plain"},
            [],
            prompt_data["sectionsummary"]["model"],
        )
        return jsonify({"success": True, "data": response})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/guide")
def get_guide():
    return render_template("guide.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(port=port, debug=True)
