import fs from "fs";
import { SubmissionAnalysis } from "../models/submissionAnalysis.js";
import { Submission } from "../models/submission.js";
import { Project } from "../models/project.js";
import { AssessmentTemplate } from "../models/assessmentTemplate.js";
import { ProjectAssessment } from "../models/projectAssessment.js";
import { parseDocument } from "../utils/documentParser.js";
import { SubmissionChunk } from "../models/submissionChunk.js";
import redisClient from "../config/redisClient.js";

import {
  generateEmbedding,
  analyzeSubmissionSingleRequest
} from "./geminiService.js";
import { buildDefaultAssessmentTemplate } from "../utils/assessmentTemplateDefaults.js";

// Mathematically safe Cosine Similarity calculation (handles magnitude-unnormalized vectors)
export const calculateCosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Strips common academic template structures to avoid false plagiarism matches
export const cleanAcademicText = (text) => {
  if (!text) return "";
  return text
    // 1. Strip cover page headers / institution names
    .replace(/trường\s+đại\s+học[\s\S]*?(?=\n\n|\n[0-9])/gi, "")
    // 2. Strip Table of Contents
    .replace(/mục\s+lục[\s\S]*?(?=\n\n|\n[0-9])/gi, "")
    // 3. Strip References / Bibliography at the end of paper
    .replace(/tài\s+liệu\s+tham\s+khảo[\s\S]*$/gi, "")
    // 4. Normalize multiple spaces
    .replace(/\s+/g, " ")
    .trim();
};

export const convertScore10ToGrade = (score10) => {
  if (score10 === null || score10 === undefined) {
    return { score4: null, letter: null };
  }
  const score = Number(score10);
  if (score >= 8.95) return { score4: 4, letter: "A+" };
  if (score >= 8.45) return { score4: 3.7, letter: "A" };
  if (score >= 7.95) return { score4: 3.5, letter: "B+" };
  if (score >= 6.95) return { score4: 3, letter: "B" };
  if (score >= 6.45) return { score4: 2.5, letter: "C+" };
  if (score >= 5.45) return { score4: 2, letter: "C" };
  if (score >= 4.95) return { score4: 1.5, letter: "D+" };
  if (score >= 3.95) return { score4: 1, letter: "D" };
  return { score4: 0, letter: "F" };
};

/**
 * Splits text into chunks of semantic word-level bounds utilizing paragraph boundaries.
 */
export const chunkDocument = (text, maxWords = 350, overlap = 50) => {
  if (!text) return [];
  
  // Clean academic boilerplate
  const cleanedText = cleanAcademicText(text);
  
  // Split by double newline (paragraph transitions)
  const rawParagraphs = cleanedText.split(/\n\s*\n+/);
  const chunks = [];
  let currentChunk = [];
  let currentWordCount = 0;

  for (const para of rawParagraphs) {
    const paraText = para.trim().replace(/\s+/g, " ");
    if (!paraText) continue;
    
    const paraWords = paraText.split(" ");
    
    // If a single paragraph is too long, split it by words
    if (paraWords.length > maxWords) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(" "));
        currentChunk = [];
        currentWordCount = 0;
      }
      
      let i = 0;
      while (i < paraWords.length) {
        const subChunk = paraWords.slice(i, i + maxWords);
        chunks.push(subChunk.join(" "));
        i += (maxWords - overlap);
      }
      continue;
    }

    if (currentWordCount + paraWords.length > maxWords) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(" "));
      }
      currentChunk = [...paraWords];
      currentWordCount = paraWords.length;
    } else {
      currentChunk = currentChunk.concat(paraWords);
      currentWordCount += paraWords.length;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }
  
  // Fallback if no chunks generated
  if (chunks.length === 0) {
    const words = cleanedText.split(" ");
    let i = 0;
    while (i < words.length) {
      const chunkWords = words.slice(i, i + maxWords);
      if (chunkWords.length === 0) break;
      chunks.push(chunkWords.join(" "));
      i += (maxWords - overlap);
    }
  }

  return chunks;
};

/**
 * Calculates keyword overlap density for confidence measurement.
 */
const calculateClueDensity = (text, cloDefinitions) => {
  if (!text || cloDefinitions.length === 0) return 0;
  const lowerText = text.toLowerCase();
  let totalKeywords = 0;
  let matchedKeywords = 0;
  
  for (const clo of cloDefinitions) {
    const words = (clo.description || "")
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 3);
      
    for (const word of words) {
      totalKeywords++;
      if (lowerText.includes(word)) {
        matchedKeywords++;
      }
    }
  }
  
  return totalKeywords > 0 ? (matchedKeywords / totalKeywords) : 0.5;
};

/**
 * Calculates similarity variance of top 5 project matches.
 */
const calculateSimilarityVariance = (chunkEmbeddings, otherProjects) => {
  if (chunkEmbeddings.length === 0 || otherProjects.length === 0) return 0;
  
  const similarities = otherProjects.map(proj => {
    let maxSim = 0;
    for (const chunkEmb of chunkEmbeddings) {
      const sim = calculateCosineSimilarity(chunkEmb, proj.embedding);
      if (sim > maxSim) maxSim = sim;
    }
    return maxSim;
  });
  
  const top5 = similarities.sort((a, b) => b - a).slice(0, 5);
  const n = top5.length;
  if (n === 0) return 0;
  
  const mean = top5.reduce((sum, val) => sum + val, 0) / n;
  const variance = top5.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  return variance;
};

/**
 * Triggers RAG retrieval for similar projects and fetches past finalized assessments.
 */
export const triggerRagRetrieval = async (docEmbedding, projectId, limit = 3) => {
  const otherProjects = await Project.find({
    _id: { $ne: projectId },
    embedding: { $exists: true, $not: { $size: 0 } }
  });

  const similarProjects = otherProjects
    .map(p => ({
      _id: p._id,
      title: p.title,
      description: p.description,
      score: calculateCosineSimilarity(docEmbedding, p.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const projectIds = similarProjects.map(p => p._id);
  const completedAssessments = await ProjectAssessment.find({
    project: { $in: projectIds },
    status: "finalized"
  });

  let ragContext = "HỆ THỐNG GỢI Ý CƠ SỞ TRI THỨC (RAG CONTEXT):\n";
  similarProjects.forEach((proj, idx) => {
    ragContext += `\n[Đề tài tương tự ${idx + 1}]: "${proj.title}" (Độ tương đồng: ${Math.round(proj.score * 100)}%)\n`;
    ragContext += `Mô tả: ${proj.description}\n`;

    const assess = completedAssessments.find(a => a.project.toString() === proj._id.toString());
    if (assess) {
      ragContext += `Đánh giá điểm số CLO thực tế của Hội đồng bảo vệ trước đây:\n`;
      assess.cloResults.forEach(clo => {
        ragContext += `- ${clo.cloCode}: ${clo.score5}/5 (${clo.status === "achieved" ? "Đạt" : "Không đạt"})\n`;
      });
      if (assess.chairComment) {
        ragContext += `Nhận xét chung của Chủ tịch hội đồng: "${assess.chairComment}"\n`;
      }
    }
  });

  return { ragContext, similarProjects };
};

/**
 * Fetches high-rating historical analyses to act as prompt context (auto-learning mechanism).
 */
export const getFeedbackExamples = async (milestone, docEmbedding, limit = 2) => {
  try {
    // 1. Fetch highly rated AI analyses from student feedback loop
    const historicalHighRatings = await SubmissionAnalysis.find({
      "scoreEstimate.milestone": milestone,
      "studentFeedback.rating": { $gte: 4 }
    }).populate("project");

    let examples = [];

    if (historicalHighRatings && historicalHighRatings.length > 0) {
      examples = historicalHighRatings.map(item => {
        let sim = 0;
        if (item.project && item.project.embedding && item.project.embedding.length > 0) {
          sim = calculateCosineSimilarity(docEmbedding, item.project.embedding);
        }
        return { item, sim, type: "feedback" };
      });
    }

    // 2. Fetch finalized actual assessments from Defense Councils as fallback/extra learning source
    const finalizedAssessments = await ProjectAssessment.find({
      status: "finalized",
      "milestones.code": milestone
    }).populate("project");

    if (finalizedAssessments && finalizedAssessments.length > 0) {
      const assessmentExamples = finalizedAssessments.map(item => {
        let sim = 0;
        if (item.project && item.project.embedding && item.project.embedding.length > 0) {
          sim = calculateCosineSimilarity(docEmbedding, item.project.embedding);
        }
        return { item, sim, type: "assessment" };
      });
      examples = examples.concat(assessmentExamples);
    }

    if (examples.length === 0) {
      return [];
    }

    // Sort by cosine similarity and slice to limit
    const matchedExamples = examples
      .sort((a, b) => b.sim - a.sim)
      .slice(0, limit)
      .map(match => {
        if (match.type === "feedback") {
          const analysis = match.item;
          return {
            documentSnippet: `Tiêu đề đề tài: "${analysis.project?.title || "N/A"}"\nMô tả: "${analysis.project?.description || "N/A"}"`,
            cloBreakdown: (analysis.scoreEstimate?.cloBreakdown || []).map(b => ({
              cloCode: b.cloCode,
              estimatedScore: b.estimatedScore,
              rationale: b.rationale
            }))
          };
        } else {
          const assessment = match.item;
          const milestoneData = assessment.milestones.find(m => m.code === milestone);
          const cloBreakdown = (milestoneData?.aggregatedCloScores || []).map(c => ({
            cloCode: c.cloCode,
            estimatedScore: c.score5,
            rationale: `Được đánh giá bởi Hội đồng bảo vệ. Trạng thái đạt: ${c.status === "achieved" ? "Đạt" : "Không đạt"}.`
          }));
          return {
            documentSnippet: `Tiêu đề đề tài: "${assessment.project?.title || "N/A"}"\nMô tả: "${assessment.project?.description || "N/A"}"`,
            cloBreakdown
          };
        }
      });

    return matchedExamples;
  } catch (error) {
    console.error("Error fetching feedback/assessment examples for learning:", error);
    return [];
  }
};

/**
 * Calculates weighted M1-M4 scores out of 5 and 10 based on matrix weight rules.
 */
const calculateWeightedScores = (cloBreakdown, template, milestoneCode) => {
  let componentWeightedTotal = 0;
  let componentWeight = 0;

  for (const clo of cloBreakdown) {
    const row = template.matrix?.get ? template.matrix.get(clo.cloCode) : template.matrix?.[clo.cloCode];
    if (!row) continue;
    
    const weightVal = row.get ? row.get(milestoneCode) : row[milestoneCode];
    const contributionWeight = Number(weightVal || 0);

    if (clo.estimatedScore === null || contributionWeight <= 0) continue;
    
    componentWeightedTotal += Number(clo.estimatedScore) * contributionWeight;
    componentWeight += contributionWeight;
  }

  const estimatedScore5 = componentWeight ? Math.round((componentWeightedTotal / componentWeight) * 100) / 100 : null;
  const estimatedScore10 = estimatedScore5 !== null ? Math.round(estimatedScore5 * 2 * 100) / 100 : null;

  return { estimatedScore5, estimatedScore10 };
};

/**
 * Orchestrator service function that processes submission document analysis.
 */
export const analyzeSubmission = async (submissionId, filePath, milestoneCode) => {
  const startTime = Date.now();
  console.log(`[AI Engine] Initializing analysis for Submission ID: ${submissionId}, Milestone: ${milestoneCode}`);

  // Fetch submission and related records
  const submission = await Submission.findById(submissionId).populate("groupId");
  if (!submission) {
    throw new Error(`Submission with ID ${submissionId} not found.`);
  }

  const project = submission.groupId;
  if (!project) {
    throw new Error(`Associated Project for submission not found.`);
  }

  const studentId = submission.submittedBy;

  // Check or create SubmissionAnalysis tracking document (per milestone)
  let analysis = await SubmissionAnalysis.findOne({
    submission: submissionId,
    "scoreEstimate.milestone": milestoneCode
  });
  if (!analysis) {
    analysis = new SubmissionAnalysis({
      submission: submissionId,
      project: project._id,
      student: studentId,
      scoreEstimate: { milestone: milestoneCode }
    });
  }

  analysis.status = "processing";
  analysis.errorMessage = null;
  await analysis.save();

  try {
    // 1. Extract raw text from file
    const docText = await parseDocument(filePath);
    if (!docText || docText.trim() === "") {
      throw new Error("Tài liệu trống hoặc không thể giải nén văn bản.");
    }

    const wordsCount = docText.trim().split(/\s+/).length;

    // 2. Chunk document (paragraph-level chunks with semantic bounds)
    const chunks = chunkDocument(docText, 350, 50);
    console.log(`[AI Engine] Created ${chunks.length} chunks from document (${wordsCount} words).`);

    // 3. Generate embeddings and run Plagiarism Check
    const activeChunks = [];
    const otherProjects = await Project.find({
      _id: { $ne: project._id },
      embedding: { $exists: true, $not: { $size: 0 } }
    });

    console.log(`[AI Engine] Generating chunk embeddings for plagiarism check against ${otherProjects.length} projects...`);
    
    const chunkPromises = chunks.map(async (chunk, idx) => {
      try {
        const emb = await generateEmbedding(chunk);
        if (emb) {
          return { text: chunk, embedding: emb, chunkIndex: idx };
        }
      } catch (err) {
        console.warn(`[AI Engine] Failed to embed chunk ${idx}:`, err.message);
      }
      return null;
    });

    const resolvedChunks = (await Promise.all(chunkPromises)).filter(Boolean);

    // Compute Plagiarism (Chunk-to-Chunk / Many-to-Many matching with project-level fallback)
    const suspiciousChunks = [];
    let maxSimilarityScore = 0;
    let totalPlagiarizedChunks = 0;

    // Fetch all paragraph chunks belonging to other projects
    const otherChunks = await SubmissionChunk.find({
      projectRef: { $ne: project._id }
    });

    console.log(`[AI Engine] Comparing against ${otherChunks.length} chunks from other submissions...`);

    for (const chunk of resolvedChunks) {
      let highestChunkSim = 0;
      let matchedChunk = null;

      if (otherChunks.length > 0) {
        // Many-to-many paragraph matching
        for (const otherChunk of otherChunks) {
          const sim = calculateCosineSimilarity(chunk.embedding, otherChunk.embedding);
          if (sim > highestChunkSim) {
            highestChunkSim = sim;
            matchedChunk = otherChunk;
          }
        }
      } else {
        // Fallback: compare chunk embedding against other projects' global embeddings
        for (const otherProj of otherProjects) {
          const sim = calculateCosineSimilarity(chunk.embedding, otherProj.embedding);
          if (sim > highestChunkSim) {
            highestChunkSim = sim;
            matchedChunk = {
              projectRef: otherProj._id,
              text: "(Đề tài gốc không có dữ liệu đoạn chi tiết)"
            };
          }
        }
      }

      if (highestChunkSim > maxSimilarityScore) {
        maxSimilarityScore = highestChunkSim;
      }

      // Flag as plagiarism if Cosine Similarity is above 85%
      if (highestChunkSim >= 0.85) {
        totalPlagiarizedChunks++;
        
        let projectTitle = "N/A";
        if (matchedChunk && matchedChunk.projectRef) {
          const matchedProj = await Project.findById(matchedChunk.projectRef).select("title");
          if (matchedProj) {
            projectTitle = matchedProj.title;
          }
        }

        suspiciousChunks.push({
          text: chunk.text,
          matchedProject: matchedChunk ? matchedChunk.projectRef : null,
          matchedProjectTitle: projectTitle,
          similarity: highestChunkSim,
          chunkIndex: chunk.chunkIndex
        });
      }
    }

    // Weighted Plagiarism Ratio calculation:
    // Proportion of flagged paragraphs out of the total paragraphs in the document
    const plagiarismDensity = resolvedChunks.length > 0 ? (totalPlagiarizedChunks / resolvedChunks.length) : 0;
    
    // Combine plagiarism density with a soft factor of overall max similarity
    const overallSimilarity = Math.max(plagiarismDensity, maxSimilarityScore * 0.2);

    const riskLevel = suspiciousChunks.length > 0 || overallSimilarity > 0.60 
      ? "high" 
      : overallSimilarity > 0.30 
        ? "medium" 
        : "low";

    analysis.plagiarismResult = {
      overallSimilarity,
      riskLevel,
      suspiciousChunks,
      usedRag: false
    };

    // 4. Compute Confidence Heuristics
    // Load assessment template
    let template = null;
    if (project.assessmentTemplateId) {
      template = await AssessmentTemplate.findById(project.assessmentTemplateId);
    }
    if (!template) {
      template = await AssessmentTemplate.findOne({
        projectTrack: project.projectTrack || "capstone",
        status: "active"
      });
    }
    if (!template) {
      template = buildDefaultAssessmentTemplate(project.projectTrack || "capstone");
    }

    const contentCoverage = Math.min(1.0, wordsCount / 800);
    const clueDensity = calculateClueDensity(docText, template.cloDefinitions || []);
    const chunkEmbeddings = resolvedChunks.map(c => c.embedding);
    const variance = calculateSimilarityVariance(chunkEmbeddings, otherProjects);
    const varianceScore = Math.min(1.0, variance * 10);

    const initialConfidence = (contentCoverage * 0.4) + (clueDensity * 0.3) + (varianceScore * 0.3);
    console.log(`[AI Engine] Computed confidence rating: ${initialConfidence.toFixed(2)} (Coverage: ${contentCoverage.toFixed(2)}, Clue density: ${clueDensity.toFixed(2)}, Variance score: ${varianceScore.toFixed(2)})`);

    // 5. Confidence-Gated RAG Fallback
    let ragContext = "";
    let similarProjects = [];
    let usedRag = false;

    // Generate overall doc embedding for RAG/feedback query
    const docEmbedding = await generateEmbedding(docText.slice(0, 3000));

    if (initialConfidence < 0.70 && docEmbedding) {
      console.log(`[AI Engine] Confidence score below 0.70. Triggering Knowledge Base (RAG) fallback...`);
      const ragData = await triggerRagRetrieval(docEmbedding, project._id, 3);
      ragContext = ragData.ragContext;
      similarProjects = ragData.similarProjects;
      usedRag = true;
      analysis.plagiarismResult.usedRag = true;
    }

    // 6. Prompt-based learning context (student feedback history)
    const feedbackExamples = docEmbedding 
      ? await getFeedbackExamples(milestoneCode, docEmbedding, 2) 
      : [];
    console.log(`[AI Engine] Retrieved ${feedbackExamples.length} highly rated few-shot examples for auto-learning.`);

    // 7. Filter CLOs relevant to this milestone (weight > 0 in matrix)
    const allClos = template.cloDefinitions || [];
    const matrixData = template.matrix || {};
    const relevantClos = allClos.filter(clo => {
      let row;
      if (matrixData.get) {
        row = matrixData.get(clo.code);
      } else {
        row = matrixData[clo.code];
      }
      if (!row) return false;
      const weight = Number(row.get ? row.get(milestoneCode) : (row[milestoneCode] || 0));
      return weight > 0;
    });

    if (relevantClos.length === 0) {
      console.warn(`[AI Engine] No CLOs with weight > 0 for milestone ${milestoneCode}. Using all CLOs as fallback.`);
    }
    const closToEvaluate = relevantClos.length > 0 ? relevantClos : allClos;

    const milestoneDef = (template.milestoneDefinitions || []).find(m => m.code === milestoneCode);
    console.log(`[AI Engine] Milestone ${milestoneCode}: Evaluating ${closToEvaluate.length}/${allClos.length} CLOs: ${closToEvaluate.map(c => c.code).join(", ")}`);

    // 8. Perform combined AI analysis in a single request to save tokens
    console.log("[AI Engine] Querying Gemini for combined scoring and feedback (single request)...");
    const aiResult = await analyzeSubmissionSingleRequest(
      docText,
      closToEvaluate,
      feedbackExamples,
      similarProjects,
      ragContext,
      milestoneCode,
      milestoneDef?.label || ""
    );

    if (!aiResult || !aiResult.scoreEstimate || !aiResult.feedback) {
      throw new Error("Mô hình AI không thể hoàn thành đánh giá điểm số và phản hồi.");
    }

    const { scoreEstimate: scoringResult, feedback: feedbackResult } = aiResult;

    if (!scoringResult.cloBreakdown) {
      throw new Error("Mô hình AI không thể đưa ra đánh giá điểm số chuẩn đầu ra.");
    }

    // Calculate final scores out of 5 and 10
    const weightedScores = calculateWeightedScores(scoringResult.cloBreakdown, template, milestoneCode);
    const grade4 = convertScore10ToGrade(weightedScores.estimatedScore10);

    analysis.scoreEstimate = {
      milestone: milestoneCode,
      estimatedScore5: weightedScores.estimatedScore5,
      estimatedScore10: weightedScores.estimatedScore10,
      estimatedScore4: grade4.score4,
      letterGrade: grade4.letter,
      cloBreakdown: scoringResult.cloBreakdown.map(clo => ({
        cloCode: clo.cloCode,
        estimatedScore: clo.estimatedScore,
        rationale: clo.rationale
      })),
      confidence: scoringResult.confidence ?? initialConfidence,
      usedRag
    };

    analysis.feedback = {
      strengths: feedbackResult.strengths || [],
      weaknesses: feedbackResult.weaknesses || [],
      suggestions: feedbackResult.suggestions || [],
      overallComment: feedbackResult.overallComment || ""
    };

    // Complete Analysis
    analysis.status = "done";
    analysis.processingTimeMs = Date.now() - startTime;
    await analysis.save();

    // Save chunks of current submission for future plagiarism checks
    try {
      await SubmissionChunk.deleteMany({ submissionRef: submissionId });
      const chunksToSave = resolvedChunks.map(chunk => ({
        projectRef: project._id,
        submissionRef: submissionId,
        text: chunk.text,
        embedding: chunk.embedding,
        chunkIndex: chunk.chunkIndex
      }));
      if (chunksToSave.length > 0) {
        await SubmissionChunk.insertMany(chunksToSave);
        console.log(`[AI Engine] Saved ${chunksToSave.length} chunks to SubmissionChunk collection for future plagiarism comparison.`);
      }
    } catch (dbErr) {
      console.error(`[AI Engine] Failed to save submission chunks for plagiarism DB:`, dbErr);
    }

    console.log(`[AI Engine] Completed analysis successfully in ${analysis.processingTimeMs}ms.`);

    // Cache result in Redis (TTL 1 hour)
    try {
      const cacheKey = `analysis:${submissionId}:${milestoneCode}`;
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(analysis.toObject()));
      console.log(`[AI Engine] Cached analysis result with key: ${cacheKey}`);
    } catch (cacheErr) {
      console.warn("[Redis] Failed to cache analysis result:", cacheErr.message);
    }

    return analysis;

  } catch (error) {
    console.error(`[AI Engine] Error in submission analysis pipeline:`, error);
    
    analysis.status = "error";
    analysis.errorMessage = error.message;
    analysis.processingTimeMs = Date.now() - startTime;
    await analysis.save();
    
    throw error;
  }
};
