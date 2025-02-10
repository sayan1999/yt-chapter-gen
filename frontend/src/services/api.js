// src/botResponseGenerator.js

const apiBase = process.env.REACT_APP_API_BASE_URL;

console.log("API Base URL:", apiBase);

const modifyChatHistory = (chatHistory) => {
  let modifiedChatHistory = [];
  for (let i = 0; i < chatHistory.length; i++) {
    modifiedChatHistory.push({
      parts: [{ text: chatHistory[i].text }],
      role: chatHistory[i].sender,
    });
  }
  let message = modifiedChatHistory.pop()["parts"][0]["text"];
  return { message: message, chatHistory: modifiedChatHistory };
};

export const generateBotResponse = async (chatHistory, videoId, subtitleId) => {
  // Simulate an API call or any other logic to generate a bot response
  try {
    let modifiedChatHistory = modifyChatHistory(chatHistory);
    console.log("Generating response from", modifiedChatHistory);

    const response = await fetch(`${apiBase}/chat/${videoId}/${subtitleId}`, {
      method: "POST", // Use POST method
      headers: {
        "Content-Type": "application/json", // Tell the server you're sending JSON
        Accept: "application/json", // Tell server to only send back json
      },
      body: JSON.stringify(modifiedChatHistory), // Convert the object to a JSON string
    });
    const data = await response.json();
    console.log("Bot response data:", data);
    return { text: data.data, sender: "model" };
  } catch (error) {
    console.error("Error fetching bot response:", error);
    throw error;
  }
};

// Generate chapters
export const generateChapters = async (videoId, subtitleId) => {
  try {
    // Fetch subtitles
    console.log("Fetching chapters for video:", videoId);
    const response = await fetch(
      `${apiBase}/chapters/${videoId}/${subtitleId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Recieved chapters data:", data);
    return data.data;
  } catch (error) {
    console.error("Error fetching chapters:", error);
    throw error;
  }
};

export const searchVideo = async (videoId, query, subtitleId) => {
  console.log("Searching video for:", query);
  try {
    const response = await fetch(`${apiBase}/search/${videoId}/${subtitleId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Recieved search data:", data);
    return data.data;
  } catch (error) {
    console.error("Error searching video:", error);
    throw error;
  }
};

export const getsectionsummary = async (
  videoId,
  sectionId,
  timestamps,
  subtitleId
) => {
  console.log("Searching video for:", sectionId);
  console.log(timestamps, sectionId);
  try {
    const response = await fetch(
      `${apiBase}/sectionsummary/${videoId}/${subtitleId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ sectionId, timestamps }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Recieved summary data:", data);
    return data.data;
  } catch (error) {
    console.error("Error summary video:", error);
    throw error;
  }
};

export const getsubtitles = async (videoId) => {
  console.log("Listing available subtitle languages for video:", videoId);
  if (!videoId) {
    console.error("Video ID is null");
    return [];
  }
  try {
    const response = await fetch(`${apiBase}/subtitles-languages/${videoId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
    console.log("Recieved subtitles data:", data.data);
    return data.data;
  } catch (error) {
    console.error("Error fetching subtitles:", error);
    throw error;
  }
};
