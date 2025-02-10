import React, { useState, useEffect } from "react";
import "./App.css";
import Chapters from "./Chapters";
import { getsubtitles } from "./services/api.js";
import { useParams } from "react-router-dom";

function App() {
  const { videoId: initialVideoId } = useParams();
  const [url, setUrl] = useState("");
  console.log("Received initialVideoId:", initialVideoId); // Debugging
  const [videoId, setVideoId] = useState(initialVideoId || null); // Initialize with initialVideoId or null
  const [subtitles, setSubtitles] = useState([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showChapters, setShowChapters] = useState(false);

  // Pre-fill the input field if videoId is provided
  useEffect(() => {
    if (initialVideoId) {
      const prefilledUrl = `https://www.youtube.com/watch?v=${initialVideoId}`;
      setUrl(prefilledUrl);
      setVideoId(initialVideoId);
      fetchSubtitles(initialVideoId);
    }
  }, [initialVideoId]);

  // Validate YouTube URL and extract video ID
  const validateUrl = (url) => {
    const pattern =
      /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
    const match = url.match(pattern);
    return match ? match[1] : null; // Return null if URL is invalid
  };

  // Fetch subtitles for the given video ID
  const fetchSubtitles = async (videoId) => {
    setIsLoading(true);
    try {
      const data = await getsubtitles(videoId);
      setSubtitles(data);
      setSelectedSubtitle(data.length > 0 ? data[0] : ""); // Default to first subtitle or empty string
    } catch (error) {
      console.error("Error fetching subtitles:", error);
      setSubtitles([]);
      setSelectedSubtitle(""); // Reset to empty string on error
    } finally {
      setIsLoading(false);
    }
  };

  // Handle URL input change
  const handleUrlChange = async (e) => {
    const inputUrl = e.target.value;
    setUrl(inputUrl);

    const videoIdFromValidation = validateUrl(inputUrl);
    console.log("Extracted videoId:", videoIdFromValidation); // Debugging

    if (videoIdFromValidation) {
      setVideoId(videoIdFromValidation); // Set videoId only if it's valid
      await fetchSubtitles(videoIdFromValidation);
    } else {
      setVideoId(null); // Explicitly set to null if URL is invalid
      setSubtitles([]);
      setSelectedSubtitle("");
    }
  };

  // Handle "Generate Chapters" button click
  const handleGenerate = () => {
    if (videoId && selectedSubtitle) {
      console.log("Passing to Chapters:", { videoId, selectedSubtitle }); // Debugging
      setShowChapters(true);
    }
  };

  // Check if the "Generate Chapters" button should be disabled
  const isButtonDisabled = !videoId || !selectedSubtitle;

  return (
    <div className="app">
      {!showChapters ? (
        <div className="container">
          <h1 className="title">YouTube Video With Chapters</h1>
          <p className="subtitle">
            Paste your YouTube URL below to generate chapters
          </p>

          <div className="form">
            <div className="input-container">
              <input
                type="text"
                placeholder="Enter YouTube URL"
                value={url}
                onChange={handleUrlChange}
                className="input"
              />
              {url && (
                <span
                  className={`validation-badge ${
                    videoId ? "valid" : "invalid"
                  }`}
                >
                  {videoId ? "✔️" : "❌"}
                </span>
              )}
            </div>

            {videoId && (
              <div className="subtitle-section">
                {isLoading ? (
                  <div className="loading">Loading subtitles...</div>
                ) : subtitles.length > 0 ? (
                  <>
                    <p className="subtitle-prompt">
                      Choose a subtitle language to proceed
                    </p>
                    <select
                      value={selectedSubtitle}
                      onChange={(e) => setSelectedSubtitle(e.target.value)}
                      className="subtitle-dropdown"
                    >
                      {subtitles.map((subtitle, index) => (
                        <option key={`${subtitle}-${index}`} value={subtitle}>
                          {subtitle}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <div className="no-subtitles">
                    No subtitles found for this video
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleGenerate}
              className="button"
              disabled={isButtonDisabled}
            >
              Generate Chapters
            </button>
          </div>
        </div>
      ) : (
        <Chapters videoId={videoId} subtitleId={selectedSubtitle} />
      )}
    </div>
  );
}

export default App;
