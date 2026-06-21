import fs from "fs";
import { Project } from "../models/project.js";
import { User } from "../models/user.js";
import { generateEmbedding, generateTeacherSummary } from "../services/geminiService.js";
import { parseDocument } from "../utils/documentParser.js";

// Helper to calculate dot product (cosine similarity since Gemini embeddings are normalized)
const calculateCosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  return vecA.reduce((sum, val, idx) => sum + val * vecB[idx], 0);
};

// Helper to calculate simple keyword matching overlap for fallback
const calculateKeywordOverlap = (text, keywords = []) => {
  if (!text || keywords.length === 0) return 0;
  const lowerText = text.toLowerCase();
  let matches = 0;
  keywords.forEach(kw => {
    if (lowerText.includes(kw.toLowerCase())) {
      matches += 1;
    }
  });
  return matches / keywords.length;
};

/**
 * Analyzes a project proposal (Title, Description, and optional uploaded outline file)
 * to find duplicates and recommend supervisors.
 */
export const analyzeProposal = async (req, res, next) => {
  const { title = "", description = "" } = req.body;
  let fileText = "";

  try {
    // 1. Extract text from file if uploaded
    if (req.file) {
      fileText = await parseDocument(req.file.path);
    }

    const cleanTitle = title.trim();
    const cleanDesc = description.trim();

    if (!cleanTitle && !cleanDesc && !fileText) {
      return res.status(400).json({
        success: false,
        message: "At least title, description, or an outline document is required for analysis."
      });
    }

    // Combine all inputs for embedding
    const queryText = `Title: ${cleanTitle}\nDescription: ${cleanDesc}\n${fileText ? `Document Content:\n${fileText}` : ""}`.trim();

    // 2. Try to generate embedding
    const embedding = await generateEmbedding(queryText);
    const isAIPowered = !!embedding;

    let duplicateProjects = [];
    let recommendedSupervisors = [];

    if (isAIPowered) {
      // --- AI-POWERED PATHWAY ---
      console.log("[AI RAG] Running vector search analysis...");

      // A. Vector Search for Similar Projects
      try {
        // Try Atlas Vector Search if configured, otherwise catch and use JS-based cosine matching
        duplicateProjects = await Project.aggregate([
          {
            $vectorSearch: {
              index: "vector_index",
              path: "embedding",
              queryVector: embedding,
              numCandidates: 15,
              limit: 5
            }
          },
          {
            $lookup: {
              from: "users",
              localField: "student",
              foreignField: "_id",
              as: "studentInfo"
            }
          },
          {
            $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true }
          },
          {
            $project: {
              title: 1,
              description: 1,
              status: 1,
              groupName: 1,
              student: "$studentInfo.name",
              score: { $meta: "vectorSearchScore" }
            }
          }
        ]);
      } catch (err) {
        console.warn("[AI RAG] Atlas Vector Search failed or not supported. Falling back to in-memory cosine matching for projects.");
        // Fallback: Fetch projects with embeddings and sort in Node.js
        const projectsWithEmbeddings = await Project.find({
          embedding: { $exists: true, $not: { $size: 0 } }
        }).populate("student", "name");

        duplicateProjects = projectsWithEmbeddings
          .map(p => {
            const score = calculateCosineSimilarity(embedding, p.embedding);
            return {
              _id: p._id,
              title: p.title,
              description: p.description,
              status: p.status,
              groupName: p.groupName,
              student: p.student?.name || "N/A",
              score
            };
          })
          // Keep similarities above 0.35 and sort descending
          .filter(p => p.score > 0.35)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      }

      // B. Vector Matching for Teachers
      const teachers = await User.find({ role: "Teacher", isActive: true });
      const teacherPromises = teachers.map(async (teacher) => {
        let teacherEmbedding = teacher.embedding;
        let summary = teacher.aiSummary;

        // Lazy-load/generate teacher embedding if it doesn't exist
        if (!teacherEmbedding || teacherEmbedding.length === 0) {
          console.log(`[AI RAG] Generating vector profile for Teacher ${teacher.name}...`);
          
          // Get past supervised projects
          const supervised = await Project.find({ supervisor: teacher._id }).limit(5);
          const pastProjData = supervised.map(p => ({ title: p.title, description: p.description }));
          
          // Generate summary
          summary = await generateTeacherSummary(teacher.experties, pastProjData);
          if (summary) {
            teacherEmbedding = await generateEmbedding(summary);
            
            // Save back to DB for caching
            teacher.aiSummary = summary;
            teacher.embedding = teacherEmbedding || [];
            await teacher.save();
          }
        }

        if (teacherEmbedding && teacherEmbedding.length > 0) {
          const score = calculateCosineSimilarity(embedding, teacherEmbedding);
          return {
            _id: teacher._id,
            name: teacher.name,
            email: teacher.email,
            department: teacher.department,
            experties: teacher.experties,
            aiSummary: summary,
            score
          };
        }
        return null;
      });

      const matchedTeachers = (await Promise.all(teacherPromises)).filter(Boolean);
      recommendedSupervisors = matchedTeachers
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

    } else {
      // --- FALLBACK PATHWAY (Traditional Search) ---
      console.log("[AI RAG] Running traditional fallback query analysis...");

      // A. Text Search for Similar Projects (Word overlap or regex)
      const words = cleanTitle.split(/\s+/).concat(cleanDesc.split(/\s+/)).filter(w => w.length > 3);
      if (words.length > 0) {
        const uniqueWords = [...new Set(words)].slice(0, 10);
        const regexQueries = uniqueWords.map(w => ({
          $or: [
            { title: { $regex: w, $options: "i" } },
            { description: { $regex: w, $options: "i" } }
          ]
        }));

        const matchedRaw = await Project.find({
          $or: regexQueries
        }).populate("student", "name").limit(20);

        duplicateProjects = matchedRaw.map(p => {
          // Calculate basic overlap score (jaccard-like)
          const pText = `${p.title} ${p.description}`.toLowerCase();
          const matches = uniqueWords.filter(w => pText.includes(w.toLowerCase())).length;
          const score = matches / uniqueWords.length;
          return {
            _id: p._id,
            title: p.title,
            description: p.description,
            status: p.status,
            groupName: p.groupName,
            student: p.student?.name || "N/A",
            score
          };
        })
        .filter(p => p.score > 0.1)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      }

      // B. Keyword Overlap Matching for Teachers
      const teachers = await User.find({ role: "Teacher", isActive: true });
      recommendedSupervisors = teachers.map(teacher => {
        const score = calculateKeywordOverlap(`${cleanTitle} ${cleanDesc} ${fileText}`, teacher.experties);
        return {
          _id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          department: teacher.department,
          experties: teacher.experties,
          aiSummary: "Được gợi ý dựa trên từ khóa chuyên môn trùng khớp với nội dung đề tài.",
          score
        };
      })
      .filter(t => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    }

    // 3. Clean up uploaded temp file if any
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.warn("Failed to delete temp file:", err.message);
      }
    }

    // 4. Return results
    return res.status(200).json({
      success: true,
      isAIPowered,
      data: {
        duplicates: duplicateProjects,
        supervisors: recommendedSupervisors
      }
    });

  } catch (error) {
    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.warn("Failed to delete temp file:", err.message);
      }
    }
    next(error);
  }
};
