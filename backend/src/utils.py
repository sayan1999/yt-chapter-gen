import requests, os, re
from dotenv import load_dotenv

load_dotenv()


def parse_subtitle(text):
    pattern = re.compile(
        r"(\d+)\n"  # Capture subtitle number (optional, but ensures correct structure)
        r"(\d{2}:\d{2}:\d{2}.\d{3}) --> (\d{2}:\d{2}:\d{2}.\d{3})\n"  # Capture timestamps
        r"(.+?)(?=\n\d+\n|\Z)",  # Capture subtitle text (non-greedy until next entry or end)
        re.DOTALL,  # Allows '.' to match newline characters within the subtitle
    )

    matches = pattern.findall(text)

    result = []
    for match in matches:
        start_time = match[1]  # Extract the start time
        subtitle_text = match[
            3
        ].strip()  # Extract the subtitle and remove leading/trailing whitespace

        # Convert timestamp to seconds
        h, m, s = start_time.split(":")
        seconds = int(h) * 3600 + int(m) * 60 + float(s)

        result.append({"timestamp_start": str(seconds), "subtitle": subtitle_text})

    return result


def get_subtitle_text(subtitleUrl):
    # access the API
    url = "https://youtube-media-downloader.p.rapidapi.com/v2/video/subtitles"
    headers = {
        "x-rapidapi-host": "youtube-media-downloader.p.rapidapi.com",
        "x-rapidapi-key": os.getenv("RAPID_API_KEY"),
    }
    # send a get subtitle text request to the API
    querystring = {"subtitleUrl": subtitleUrl}
    response = requests.request("GET", url, headers=headers, params=querystring)
    # return the text response
    return response.text


def get_video_details(video_id):
    url = "https://youtube-media-downloader.p.rapidapi.com/v2/video/details"
    querystring = {"videoId": video_id}
    headers = {
        "x-rapidapi-key": os.getenv("RAPID_API_KEY"),
        "x-rapidapi-host": "youtube-media-downloader.p.rapidapi.com",
    }
    response = requests.request("GET", url, headers=headers, params=querystring)
    return response.json()


def get_subtitle_languages(video_id):
    resp = get_video_details(video_id)
    return [obj["code"] for obj in resp["subtitles"]["items"]]


def get_sub(video_id, lang):
    resp = get_video_details(video_id)
    for obj in resp["subtitles"]["items"]:
        if obj["code"] == lang:
            return parse_subtitle(get_subtitle_text(obj["url"]))


if __name__ == "__main__":
    print(get_subtitle_languages("gct59GyCg54"))

    print(get_sub("gct59GyCg54", "en"))
