import mongoose from "mongoose";

const submissionChunkSchema = new mongoose.Schema(
  {
    projectRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required"],
    },
    submissionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: [true, "Submission reference is required"],
    },
    text: {
      type: String,
      required: [true, "Chunk text is required"],
    },
    embedding: {
      type: [Number],
      required: [true, "Chunk embedding vector is required"],
    },
    chunkIndex: {
      type: Number,
      required: [true, "Chunk index is required"],
    },
  },
  { timestamps: true }
);

submissionChunkSchema.index({ projectRef: 1 });
submissionChunkSchema.index({ submissionRef: 1 });

export const SubmissionChunk =
  mongoose.models.SubmissionChunk ||
  mongoose.model("SubmissionChunk", submissionChunkSchema);
