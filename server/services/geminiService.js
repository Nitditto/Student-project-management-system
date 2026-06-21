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
    const model = ai.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
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
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const expertiseStr = expertise.length > 0 ? expertise.join(", ") : "Chưa xác định";
    const projectsStr = pastProjects.length > 0 
      ? pastProjects.map((p, i) => `${i + 1}. Đề tài: ${p.title}\nMô tả: ${p.description}`).join("\n\n") 
      : "Chưa hướng dẫn đề tài nào trước đây";

    const prompt = `Bạn là một trợ lý học thuật thông minh. Hãy tổng hợp và viết một đoạn mô tả học thuật ngắn gọn (khoảng 150-200 từ, bằng tiếng Việt) giới thiệu về chuyên môn và định hướng nghiên cứu của Giảng viên dựa trên các thông tin sau:
1. Các từ khóa chuyên môn (Expertise tags): ${expertiseStr}
2. Danh sách các đề tài đã hướng dẫn trong quá khứ:
${projectsStr}

Đoạn văn cần viết tự nhiên, súc tích, chuyên nghiệp, phản ánh đúng hướng nghiên cứu trọng tâm của Giảng viên này. Không thêm các thông tin ngoài lề không có trong ngữ cảnh.`;

    const result = await model.generateContent(prompt);
    if (result && result.response) {
      return result.response.text();
    }
    throw new Error("Invalid content generation response from Gemini API");
  } catch (error) {
    console.error("Error in generateTeacherSummary:", error.message);
    return null;
  }
};
