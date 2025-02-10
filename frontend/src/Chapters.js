import React, { useEffect, useState } from "react";
import {
  generateChapters,
  searchVideo,
  generateBotResponse,
  getsectionsummary,
} from "./services/api";
import { FaPaperPlane, FaTrash, FaSpinner } from "react-icons/fa";
import "./Chapters.css";

const Chapters = ({ videoId, subtitleId }) => {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState("");
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [expandedRows, setExpandedRows] = useState({});

  // Track loading states for individual section generation
  const [sectionLoadingStates, setSectionLoadingStates] = useState({});
  const [chatbotLoading, setChatbotLoading] = useState(false);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const data = await generateChapters(videoId, subtitleId);
        setChapters(data);
      } catch (error) {
        console.error("Error fetching chapters:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, [videoId, subtitleId]);

  const handleSearch = async () => {
    if (query.trim() === "") return;

    setSearchLoading(true);
    try {
      const data = await searchVideo(videoId, query, subtitleId);
      setSummary(data.summary);
      setResults(data.results);
    } catch (error) {
      console.error("Error searching video:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === "") return;

    const userMessage = { text: inputValue, sender: "user" };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue("");
    setChatbotLoading(true);

    try {
      const botResponse = await generateBotResponse(
        [...messages, userMessage],
        videoId,
        subtitleId
      );
      setMessages((prevMessages) => [...prevMessages, botResponse]);
    } catch (error) {
      console.error("Error generating bot response:", error);
    } finally {
      setChatbotLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const seekToTimestamp = (timestamp) => {
    const iframe = document.getElementById("youtube-player");
    if (iframe) {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [timestamp, true],
        }),
        "*"
      );
    }
  };

  const formatTimestamp = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  const handleGenerateParagraph = async (index) => {
    // Set loading state for specific section
    setSectionLoadingStates((prev) => ({
      ...prev,
      [index]: true,
    }));

    try {
      const sectionsummary = await getsectionsummary(
        videoId,
        index,
        chapters.map((chapter) => chapter.timestamp),
        subtitleId
      );

      // Update the expandedRows state to include the generated paragraph
      setExpandedRows((prev) => ({
        ...prev,
        [index]: sectionsummary,
      }));
    } catch (error) {
      console.error("Error generating section summary:", error);
    } finally {
      // Clear loading state for specific section
      setSectionLoadingStates((prev) => ({
        ...prev,
        [index]: false,
      }));
    }
  };

  return (
    <div className="page-container">
      {/* Left Half: Existing Content */}
      <div className="left-half">
        <div className="chapters-container">
          {/* YouTube Video Embed */}
          {videoId && (
            <div className="video-wrapper">
              <div className="video-aspect-ratio">
                <iframe
                  id="youtube-player"
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}

          {/* Chapters Table */}
          <div className="chapters-table">
            {loading ? (
              <p>Loading chapters...</p>
            ) : (
              <table>
                <tbody>
                  {chapters.map((chapter, index) => (
                    <React.Fragment key={index}>
                      <tr className="chapter-row">
                        <td
                          className="timestamp-cell"
                          onClick={() => seekToTimestamp(chapter.timestamp)}
                        >
                          <button
                            className="play-button"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click event
                              seekToTimestamp(chapter.timestamp);
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              width="24"
                              height="24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>
                          {formatTimestamp(chapter.timestamp)}
                        </td>
                        <td>{chapter.title}</td>
                        <td>{chapter.description}</td>
                        <td>
                          <button
                            className="generate-button"
                            onClick={() => handleGenerateParagraph(index)}
                            disabled={sectionLoadingStates[index]}
                          >
                            {sectionLoadingStates[index] ? (
                              <FaSpinner className="spinner" />
                            ) : (
                              "See more ..."
                            )}
                          </button>
                        </td>
                      </tr>
                      {expandedRows[index] && (
                        <tr>
                          <td colSpan="4" className="expanded-section">
                            <p>{expandedRows[index]}</p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Middle Section: SearchBox */}
      <div className="middle-section">
        <div className="search-box-container">
          <div className="search-box-header">
            <h3>Search inside the video!</h3>
          </div>

          <div className="search-input-container">
            <input
              type="text"
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for inside video..."
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              className="search-button"
              onClick={handleSearch}
              disabled={searchLoading}
            >
              {searchLoading ? <FaSpinner className="spinner" /> : "Search"}
            </button>
          </div>

          {searchLoading && <p>Loading results...</p>}

          {summary && (
            <div className="search-summary">
              <p>{summary}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="search-results-table">
              <table>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index}>
                      <td className="timestamp-cell">
                        <button
                          className="play-button"
                          onClick={() => seekToTimestamp(result.timestamp)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            width="16"
                            height="16"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          {formatTimestamp(result.timestamp)}
                        </button>
                      </td>
                      <td>{result.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Right Half: ChatBot Section */}
      <div className="right-half">
        <div className="chat-container">
          {/* Chat Header */}
          <div className="chat-header">
            <h3>Copilot (Chat about the video)</h3>
            <button className="clear-chat-button" onClick={handleClearChat}>
              <FaTrash className="clear-icon" />
            </button>
          </div>

          {/* Chat History */}
          <div className="chat-history">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${
                  message.sender === "user" ? "user-message" : "bot-message"
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button
              className="send-button"
              onClick={handleSendMessage}
              disabled={chatbotLoading}
            >
              {chatbotLoading ? (
                <FaSpinner className="spinner" />
              ) : (
                <FaPaperPlane className="send-icon" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chapters;
