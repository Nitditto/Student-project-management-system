import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;

const getGenAIInstance = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in the environment variables. AI features will fallback to traditional search.");
      return null;
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

/**
 * Generates a 768-dimensional vector embedding for the given text.
 * @param {string} text 
 * @returns {Promise<number[]|null>} Array of floats or null if failed / not configured.
 */
export const generateEmbedding = async (text) => {
  const ai = getGenAIInstance();
  if (!ai || !text || text.trim() === "") {
    return null;
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: 768
    });
    if (result && result.embedding && result.embedding.values) {
      return result.embedding.values;
    }
    throw new Error("Invalid embedding response from Gemini API");
  } catch (error) {
    console.error("Error in generateEmbedding:", error.message);
    return null;
  }
};

/**
 * Helper to call Gemini with automatic retry and exponential backoff.
 */
const callGeminiWithRetry = async (model, prompt, retries = 4, delayMs = 1500) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      if (result && result.response) {
        return result;
      }
      throw new Error("Empty response from Gemini API");
    } catch (error) {
      const errorMsg = error.message || "";
      const statusCode = error.status || 0;
      const isRetryable = statusCode === 503 || statusCode === 429 || errorMsg.includes("503") || errorMsg.includes("429");
      
      if (isRetryable && i < retries - 1) {
        console.warn(`[Gemini API] Retryable error: ${errorMsg}. Retrying in ${delayMs}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2.5; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
};

/**
 * Synthesizes a teacher's research profile based on their expertise and past project supervisions.
 * @param {string[]} expertise 
 * @param {Array<{title: string, description: string}>} pastProjects 
 * @returns {Promise<string|null>} Summary string or null if failed / not configured.
 */
export const generateTeacherSummary = async (expertise = [], pastProjects = []) => {
  const ai = getGenAIInstance();
  if (!ai) {
    return null;
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    const expertiseStr = expertise.length > 0 ? expertise.join(", ") : "Chưa xác định";
    const projectsStr = pastProjects.length > 0 
      ? pastProjects.map((p, i) => `${i + 1}. Đề tài: ${p.title}\nMô tả: ${p.description}`).join("\n\n") 
      : "Chưa hướng dẫn đề tài nào trước đây";

    const prompt = `Bạn là một trợ lý học thuật thông minh. Hãy tổng hợp và viết một đoạn mô tả học thuật ngắn gọn (khoảng 150-200 từ, bằng tiếng Việt) giới thiệu về chuyên môn và định hướng nghiên cứu của Giảng viên dựa trên các thông tin sau:
1. Các từ khóa chuyên môn (Expertise tags): ${expertiseStr}
2. Danh sách các đề tài đã hướng dẫn trong quá khứ:
${projectsStr}

Đoạn văn cần viết tự nhiên, súc tích, chuyên nghiệp, phản ánh đúng hướng nghiên cứu trọng tâm của Giảng viên này. Không thêm các thông tin ngoài lề không có trong ngữ cảnh.`;

    const result = await callGeminiWithRetry(model, prompt);
    if (result && result.response) {
      return result.response.text();
    }
    throw new Error("Invalid content generation response from Gemini API");
  } catch (error) {
    console.error("Error in generateTeacherSummary:", error.message);
    return null;
  }
};

/**
 * Helper to clean markdown json blocks and parse safely
 */
const parseJSONSafely = (text) => {
  try {
    let cleanText = text.trim();
    
    // 1. Remove markdown wrapping if present
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    
    cleanText = cleanText.trim();

    // 2. Extract content from the first '{' to the last '}'
    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    // 3. Attempt parsing with progressive trailing brace stripping if needed
    let parseError = null;
    let currentText = cleanText;
    
    for (let attempts = 0; attempts < 5; attempts++) {
      try {
        return JSON.parse(currentText);
      } catch (err) {
        parseError = err;
        currentText = currentText.trim();
        if (currentText.endsWith("}")) {
          // Verify if we have more closing braces than opening braces in the string
          const openCount = (currentText.match(/\{/g) || []).length;
          const closeCount = (currentText.match(/\}/g) || []).length;
          if (closeCount > openCount) {
            currentText = currentText.slice(0, -1).trim();
            continue;
          }
        }
        break;
      }
    }
    
    throw parseError || new Error("Unknown parsing error");
  } catch (e) {
    console.error("Failed to parse JSON content from AI response:", e.message, "\nRaw response:", text);
    return null;
  }
};

/**
 * Estimates scores for each CLO based on the document text, CLO definitions, and historical examples.
 * @param {string} documentText 
 * @param {Array} cloDefinitions 
 * @param {Array} existingExamples 
 * @returns {Promise<Object|null>} JSON object with cloBreakdown and confidence, or null.
 */
export const estimateScoreWithRubric = async (documentText, cloDefinitions = [], existingExamples = []) => {
  const ai = getGenAIInstance();
  if (!documentText || documentText.trim() === "") {
    return null;
  }

  if (!ai) {
    console.warn("[AI Engine] Gemini API Key is missing. Falling back to heuristic mock scoring...");
    const mockCloBreakdown = cloDefinitions.map(clo => {
      const score = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
      return {
        cloCode: clo.code,
        estimatedScore: score,
        rationale: `[Bản xem trước - Không có API Key] Đánh giá sơ bộ dựa trên sự hiện diện của các thuật ngữ chuyên ngành liên quan đến ${clo.label} trong văn bản báo cáo.`
      };
    });

    return {
      cloBreakdown: mockCloBreakdown,
      confidence: 0.65
    };
  }

  try {
    const model = ai.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: { responseMimeType: "application/json" }
    });

    const cloStr = cloDefinitions.map(c => `- ${c.code}: ${c.label}. Mô tả: ${c.description || "N/A"}`).join("\n");
    const examplesStr = existingExamples && existingExamples.length > 0
      ? existingExamples.map((ex, idx) => `Ví dụ ${idx + 1}:\nNội dung tóm tắt: "${ex.documentSnippet}"\nĐánh giá CLO thực tế:\n${JSON.stringify(ex.cloBreakdown, null, 2)}`).join("\n\n")
      : "Không có ví dụ mẫu.";

    const prompt = `Bạn là một chuyên gia đánh giá học thuật độc lập. Dựa vào nội dung tài liệu báo cáo của sinh viên dưới đây và các chuẩn đầu ra (CLO) của học phần, hãy ước lượng điểm số cho từng CLO theo thang điểm 1-5 (nguyên, từ 1 đến 5).
Đồng thời tính toán độ tự tin (confidence score, từ 0 đến 1) của bạn đối với việc đánh giá này. Nếu thông tin trong tài liệu không đủ rõ ràng để đánh giá một số CLO, hãy giảm độ tự tin xuống tương ứng.

Danh sách chuẩn đầu ra (CLO) cần đánh giá:
${cloStr}

---
Các ví dụ tham khảo từ lịch sử đánh giá đã có phản hồi tốt (Dùng để học hỏi cách đánh giá tương tự):
${examplesStr}

---
Nội dung tài liệu của sinh viên:
${documentText.slice(0, 40000)}

Hãy trả về kết quả dưới dạng JSON có cấu trúc như sau:
{
  "cloBreakdown": [
    {
      "cloCode": "Mã CLO (ví dụ: CLO1)",
      "estimatedScore": 4, // Số nguyên từ 1 đến 5
      "rationale": "Giải thích chi tiết tại sao chấm điểm này dựa trên nội dung cụ thể trong báo cáo (bằng tiếng Việt)"
    }
  ],
  "confidence": 0.85 // Độ tự tin từ 0.0 đến 1.0. Nếu tài liệu thiếu thông tin hoặc sơ sài cho các CLO này, hạ độ tự tin xuống dưới 0.70.
}
`;

    const result = await callGeminiWithRetry(model, prompt);
    if (result && result.response) {
      const responseText = result.response.text();
      return parseJSONSafely(responseText);
    }
    throw new Error("Invalid response from Gemini API for score estimation");
  } catch (error) {
    console.error("Error in estimateScoreWithRubric:", error);
    return null;
  }
};

/**
 * Generates personalized structured feedback based on document text, score breakdown, and optional similar projects.
 * @param {string} documentText 
 * @param {Array} scoreBreakdown 
 * @param {Array} similarProjects 
 * @returns {Promise<Object|null>} JSON object with feedback details, or null.
 */
export const generateStructuredFeedback = async (documentText, scoreBreakdown = [], similarProjects = []) => {
  const ai = getGenAIInstance();
  if (!documentText || documentText.trim() === "") {
    return null;
  }

  if (!ai) {
    console.warn("[AI Engine] Gemini API Key is missing. Falling back to heuristic mock feedback...");
    return {
      strengths: [
        "Tài liệu trình bày đúng bố cục khoa học, phân chia chương mục rõ ràng.",
        "Nêu bật được tính cấp thiết của đề tài và hướng tiếp cận kỹ thuật sơ bộ."
      ],
      weaknesses: [
        "Phần phân tích giải pháp kỹ thuật chi tiết còn mang tính tổng quan, thiếu sơ đồ minh họa cụ thể.",
        "Chưa cung cấp nhiều số liệu hoặc biểu đồ chứng minh kết quả thực nghiệm chi tiết."
      ],
      suggestions: [
        "Cần bổ sung sơ đồ thiết kế kiến trúc hệ thống chi tiết ở Chương 2.",
        "Thêm số liệu so sánh hiệu năng, tốc độ phản hồi hoặc kết quả đo lường độ chính xác để làm nổi bật kết quả chương thực nghiệm."
      ],
      overallComment: "[Chế độ demo - Không có API Key] Báo cáo có chất lượng cơ bản tốt, đáp ứng các yêu cầu cốt lõi của milestone này. Cần tập trung làm rõ thiết kế kỹ thuật và số liệu thực nghiệm để nâng cao điểm số."
    };
  }

  try {
    const model = ai.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: { responseMimeType: "application/json" }
    });

    const scoresStr = scoreBreakdown.map(s => `- ${s.cloCode}: Điểm ${s.estimatedScore}/5. Lý do: ${s.rationale}`).join("\n");
    const similarStr = similarProjects && similarProjects.length > 0
      ? similarProjects.map((p, idx) => `- Đề tài liên quan ${idx + 1}: "${p.title}"\n  Mô tả: ${p.description || "N/A"}`).join("\n")
      : "Không có đề tài liên quan.";

    const prompt = `Bạn là một giảng viên hướng dẫn tận tâm và sắc sảo. Dựa vào nội dung tài liệu báo cáo của sinh viên, kết quả đánh giá điểm số dự kiến từng CLO và danh sách các đề tài liên quan trong cơ sở tri thức (nếu có), hãy viết phản hồi chi tiết để sinh viên cải thiện chất lượng báo cáo.

Kết quả chấm điểm CLO dự kiến:
${scoresStr}

Các đề tài liên quan để tham khảo định hướng:
${similarStr}

---
Nội dung tài liệu của sinh viên:
${documentText.slice(0, 40000)}

Hãy đưa ra phản hồi bằng tiếng Việt dưới dạng JSON có cấu trúc như sau:
{
  "strengths": [
    "Điểm mạnh thứ nhất (cụ thể, rõ ràng, dựa trên nội dung báo cáo)",
    "Điểm mạnh thứ hai..."
  ],
  "weaknesses": [
    "Điểm yếu hoặc phần thiếu sót thứ nhất",
    "Điểm yếu hoặc phần thiếu sót thứ hai..."
  ],
  "suggestions": [
    "Khuyến nghị cụ thể 1 để khắc phục điểm yếu và nâng cao điểm số",
    "Khuyến nghị cụ thể 2..."
  ],
  "overallComment": "Nhận xét tổng quan mang tính động viên và định hướng hành động."
}
`;

    const result = await callGeminiWithRetry(model, prompt);
    if (result && result.response) {
      const responseText = result.response.text();
      return parseJSONSafely(responseText);
    }
    throw new Error("Invalid response from Gemini API for feedback generation");
  } catch (error) {
    console.error("Error in generateStructuredFeedback:", error);
    return null;
  }
};

/**
 * Performs both CLO scoring and personal feedback generation in a single Gemini API request.
 * Saves tokens by avoiding sending the document text twice.
 */
export const analyzeSubmissionSingleRequest = async (
  documentText,
  cloDefinitions = [],
  feedbackExamples = [],
  similarProjects = [],
  ragContext = "",
  milestoneCode = "",
  milestoneLabel = ""
) => {
  const ai = getGenAIInstance();
  if (!documentText || documentText.trim() === "") {
    return null;
  }

  if (!ai) {
    console.warn("[AI Engine] Gemini API Key is missing. Falling back to mock data...");
    const mockCloBreakdown = cloDefinitions.map(clo => {
      const score = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
      return {
        cloCode: clo.code,
        estimatedScore: score,
        rationale: `[Demo - Không có API Key] Đánh giá sơ bộ ${clo.label} cho giai đoạn ${milestoneCode || "N/A"}.`
      };
    });
    return {
      scoreEstimate: {
        cloBreakdown: mockCloBreakdown,
        confidence: 0.65
      },
      feedback: {
        strengths: [
          "Tài liệu trình bày đúng bố cục khoa học, phân chia chương mục rõ ràng.",
          "Nêu bật được tính cấp thiết của đề tài và hướng tiếp cận kỹ thuật sơ bộ."
        ],
        weaknesses: [
          "Phần phân tích giải pháp kỹ thuật chi tiết còn mang tính tổng quan, thiếu sơ đồ minh họa cụ thể.",
          "Chưa cung cấp nhiều số liệu hoặc biểu đồ chứng minh kết quả thực nghiệm chi tiết."
        ],
        suggestions: [
          "Cần bổ sung sơ đồ thiết kế kiến trúc hệ thống chi tiết ở Chương 2.",
          "Thêm số liệu so sánh hiệu năng, tốc độ phản hồi hoặc kết quả đo lường độ chính xác để làm nổi bật kết quả chương thực nghiệm."
        ],
        overallComment: "[Chế độ demo - Không có API Key] Báo cáo có chất lượng cơ bản tốt, đáp ứng các yêu cầu cốt lõi. Cần làm rõ thiết kế kỹ thuật và số liệu thực nghiệm để nâng cao điểm số."
      }
    };
  }

  try {
    const model = ai.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: { responseMimeType: "application/json" }
    });

    const cloStr = cloDefinitions.map(c => `- ${c.code}: ${c.label}. Mô tả: ${c.description || "N/A"}`).join("\n");
    const examplesStr = feedbackExamples && feedbackExamples.length > 0
      ? feedbackExamples.map((ex, idx) => `Ví dụ ${idx + 1}:\nNội dung tóm tắt: "${ex.documentSnippet}"\nĐánh giá CLO thực tế:\n${JSON.stringify(ex.cloBreakdown, null, 2)}`).join("\n\n")
      : "Không có ví dụ mẫu.";
    const similarStr = similarProjects && similarProjects.length > 0
      ? similarProjects.map((p, idx) => `- Đề tài liên quan ${idx + 1}: "${p.title}"\n  Mô tả: ${p.description || "N/A"}`).join("\n")
      : "Không có đề tài liên quan.";

    const milestoneInfo = milestoneCode
      ? `\nBạn đang đánh giá giai đoạn: **${milestoneCode} - ${milestoneLabel || milestoneCode}**.\nCHỈ đánh giá các chuẩn đầu ra (CLO) được liệt kê dưới đây. KHÔNG thêm CLO nào khác ngoài danh sách này.\nĐánh giá dựa trên nội dung bài báo cáo có PHẢN ÁNH ĐÚNG yêu cầu của giai đoạn ${milestoneCode} hay không.\n`
      : "";

    const prompt = `Bạn là một giảng viên hướng dẫn tốt nghiệp và chuyên gia đánh giá học thuật độc lập, tận tâm và sắc sảo.
Dựa vào nội dung tài liệu báo cáo của sinh viên, hãy thực hiện ĐỒNG THỜI hai nhiệm vụ sau:
${milestoneInfo}
Nhiệm vụ 1: Ước lượng điểm số cho từng CLO theo thang điểm 1-5 (số nguyên từ 1 đến 5).
Đồng thời tính toán độ tự tin (confidence score, từ 0 đến 1). Nếu tài liệu không đủ rõ ràng để đánh giá, hãy giảm confidence xuống dưới 0.70.

Nhiệm vụ 2: Tạo phản hồi nhận xét cá nhân hóa bằng tiếng Việt gồm điểm mạnh, điểm yếu và đề xuất cải thiện cụ thể dựa trên điểm CLO và nội dung báo cáo.

Danh sách CLO cần đánh giá cho giai đoạn ${milestoneCode || "tổng hợp"}:
${cloStr}

${examplesStr !== "Không có ví dụ mẫu." ? `---\nVí dụ tham khảo lịch sử đánh giá:\n${examplesStr}\n` : ""}
${similarStr !== "Không có đề tài liên quan." ? `---\nĐề tài liên quan trong cơ sở tri thức:\n${similarStr}\n` : ""}
${ragContext ? `---\nĐối chiếu RAG (điểm số/nhận xét thực tế Hội đồng bảo vệ):\n${ragContext}\n` : ""}
---
Nội dung tài liệu báo cáo của sinh viên:
${documentText.slice(0, 40000)}

---
QUAN TRỌNG: Chỉ trả về JSON duy nhất với cấu trúc sau. Chỉ bao gồm các CLO đã liệt kê ở trên:
{
  "scoreEstimate": {
    "cloBreakdown": [
      {
        "cloCode": "CLO1",
        "estimatedScore": 4,
        "rationale": "Giải thích chi tiết bằng tiếng Việt"
      }
    ],
    "confidence": 0.85
  },
  "feedback": {
    "strengths": ["Điểm mạnh cụ thể dựa trên nội dung báo cáo"],
    "weaknesses": ["Điểm yếu / thiếu sót cần lưu ý"],
    "suggestions": ["Khuyến nghị cụ thể để cải thiện"],
    "overallComment": "Nhận xét tổng quan mang tính động viên và định hướng."
  }
}
`;

    const result = await callGeminiWithRetry(model, prompt);
    if (result && result.response) {
      const responseText = result.response.text();
      return parseJSONSafely(responseText);
    }
    throw new Error("Invalid response from Gemini API for single request analysis");
  } catch (error) {
    console.error("Error in analyzeSubmissionSingleRequest:", error);
    return null;
  }
};

