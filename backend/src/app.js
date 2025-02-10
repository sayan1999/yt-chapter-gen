import ytdl from "@distube/ytdl-core";
import express from "express";
import { getSubtitles } from "youtube-captions-scraper";
import fs from "fs";
import yaml from "js-yaml";
import "dotenv/config";
import cors from "cors";

const router = express.Router();
const app = express();
app.use(express.json());
app.use(cors());

const yamlFilePath = "config/prompt.yaml";

const loadPromptFromYaml = (filePath) => {
  const fileContents = fs.readFileSync(filePath, "utf8");
  const data = yaml.load(fileContents);
  return data;
};
function filtersubtitles(captions, sectionId, timestamps) {
  // Convert timestamps to numbers and sort them
  const sortedTimestamps = timestamps.map(Number).sort((a, b) => a - b);

  // Determine the interval based on the sectionId
  let startInterval, endInterval;

  if (sectionId === 0) {
    startInterval = -Infinity;
    endInterval = sortedTimestamps[0];
  } else if (sectionId >= sortedTimestamps.length) {
    startInterval = sortedTimestamps[sortedTimestamps.length - 1];
    endInterval = Infinity;
  } else {
    startInterval = sortedTimestamps[sectionId - 1];
    endInterval = sortedTimestamps[sectionId];
  }

  // Filter captions that fall within the interval
  const filteredCaptions = captions.filter((caption) => {
    const captionStart = Number(caption.timestamp_start);
    return captionStart >= startInterval && captionStart <= endInterval;
  });

  // Return the filtered captions with their timestamps
  return filteredCaptions.map((caption) => ({
    timestamp_start: caption.timestamp_start,
    subtitle: caption.subtitle,
  }));
}
const useGeminiAPI = async (
  prompt,
  config = {},
  history = [],
  model = "gemini-exp-1206"
) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    ...config,
  };

  try {
    const response = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            ...history,
            ,
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}: ${response}`);
    }

    const data = await response.json();

    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content
    ) {
      throw new Error("Invalid response structure from Gemini API");
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    console.log("Generated text:", generatedText);
    return generatedText;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};

router.get("/subtitles-languages/:videoId", async (req, res) => {
  try {
    const { videoId, subtitleId } = req.params;
    const info = await ytdl.getBasicInfo(videoId);
    const languages = extractLanguageInfo(info);
    res.json({ success: true, data: languages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function extractLanguageInfo(jsonData) {
  const languageDict = [];

  jsonData.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.forEach(
    (entry) => {
      if (entry.languageCode && entry.name) {
        languageDict.push(entry.languageCode);
      }
    }
  );

  return languageDict;
}

const getSub = async (videoId, lang) => {
  try {
    const captions = await getSubtitles({
      videoID: videoId,
      lang: lang,
    });
    const convertedCaptions = captions.map((item) => {
      return {
        timestamp_start: item.start,
        subtitle: item.text,
      };
    });
    return convertedCaptions;
  } catch (error) {
    console.error("Error getting subtitles:", error, lang);
    return null;
  }
};

router.get("/subtitles/:videoId/:subtitleId", async (req, res) => {
  try {
    const { videoId, subtitleId } = req.params;
    const captions = await getSub(videoId, subtitleId);

    res.json({ success: true, data: captions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/chat/:videoId/:subtitleId", async (req, res) => {
  try {
    const { videoId, subtitleId } = req.params;
    const { message, chatHistory } = req.body;
    const captions = await getSub(videoId, subtitleId);
    const contextmessage = `
    ## SYSTEM PROMPT ##
    ${loadPromptFromYaml(yamlFilePath).chat.prompt}
    ## END OF SYSTEM PROMPT ##


    ## CONTEXT OF THE YOUTUBE VIDEO ##
    ${JSON.stringify(captions)}
    ## END OF CONTEXT ##

    ${message}
    `;
    const response = await useGeminiAPI(
      contextmessage,
      { responseMimeType: "text/plain" },
      chatHistory,
      loadPromptFromYaml(yamlFilePath).chat.model
    );
    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/chapters/:videoId/:subtitleId", async (req, res) => {
  try {
    const { videoId, subtitleId } = req.params;
    const captions = await getSub(videoId, subtitleId);

    const prompt = `
    ${loadPromptFromYaml(yamlFilePath).chapter.prompt}

    ## Video Captions ##
    ${JSON.stringify(captions)}
    ## End of Video Captions ##
    `;

    const response = await useGeminiAPI(
      prompt,
      {
        responseMimeType: "application/json",
      },
      [],
      loadPromptFromYaml(yamlFilePath).chapter.model
    );
    res.json({ success: true, data: JSON.parse(response) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/search/:videoId/:subtitleId", async (req, res) => {
  try {
    const { videoId, subtitleId } = req.params;
    const captions = await getSub(videoId, subtitleId);

    const { query } = req.body;

    const prompt = `
    ${loadPromptFromYaml(yamlFilePath).search.prompt}


    ## Video Captions ##
    ${JSON.stringify(captions)}
    ## End of Video Captions ##

    ## User Query ##
    ${query}
    ## End of User Query ##
    `;

    const response = await useGeminiAPI(
      prompt,
      {
        responseMimeType: "application/json",
      },
      [],
      loadPromptFromYaml(yamlFilePath).search.model
    );
    res.json({ success: true, data: JSON.parse(response) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/sectionsummary/:videoId/:subtitleId", async (req, res) => {
  try {
    const { videoId, subtitleId } = req.params;
    const { sectionId, timestamps } = req.body;

    const captions = await getSub(videoId, subtitleId);

    const filtered_subtitles = filtersubtitles(captions, sectionId, timestamps);

    const prompt = `
    ${loadPromptFromYaml(yamlFilePath).sectionsummary.prompt}

    ## Video Captions ##

    ${JSON.stringify(captions)}

    ## End of Video Captions ##
    
    ## Summary Section ##
    ${JSON.stringify(filtered_subtitles)}
    ## End of Summary Section ##
    
    `;
    const response = await useGeminiAPI(
      prompt,
      {
        responseMimeType: "text/plain",
      },
      [],
      loadPromptFromYaml(yamlFilePath).sectionsummary.model
    );
    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use("/api", router);

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
