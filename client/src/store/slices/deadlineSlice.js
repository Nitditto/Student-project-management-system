import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

export const createDeadline = createAsyncThunk(
  "deadline/create",
  async (data, thunkAPI) => {
    try {
      const res = await axiosInstance.post("/deadline", data);
      toast.success(res.data.message || "Deadline created successfully");
      return res.data.data.deadline;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to create deadline";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updateDeadline = createAsyncThunk(
  "deadline/update",
  async ({ deadlineId, data }, thunkAPI) => {
    try {
      const res = await axiosInstance.put(`/deadline/${deadlineId}`, data);
      toast.success(res.data.message || "Deadline updated successfully");
      return res.data.data.deadline;
    } catch (error) {
      let message = error.response?.data?.message;
      if (!message && error.response?.status === 404) {
        message = "API endpoint not found. Please restart your backend server.";
      }
      toast.error(message || "Failed to update deadline");
      return thunkAPI.rejectWithValue(message || "Failed to update deadline");
    }
  }
);

export const deleteDeadline = createAsyncThunk(
  "deadline/delete",
  async (deadlineId, thunkAPI) => {
    try {
      const res = await axiosInstance.delete(`/deadline/${deadlineId}`);
      toast.success(res.data.message || "Deadline deleted successfully");
      return deadlineId;
    } catch (error) {
      let message = error.response?.data?.message;
      if (!message && error.response?.status === 404) {
        message = "API endpoint not found. Please restart your backend server.";
      }
      toast.error(message || "Failed to delete deadline");
      return thunkAPI.rejectWithValue(message || "Failed to delete deadline");
    }
  }
);

export const fetchTeacherDeadlines = createAsyncThunk(
  "deadline/fetchTeacher",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get("/deadline/teacher");
      return res.data.data.deadlines;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch teacher deadlines");
    }
  }
);

export const fetchStudentDeadlines = createAsyncThunk(
  "deadline/fetchStudent",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get("/deadline/student");
      return res.data.data.deadlines;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch student deadlines");
    }
  }
);

export const fetchTeacherMatrix = createAsyncThunk(
  "deadline/fetchTeacherMatrix",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get("/deadline/teacher/matrix");
      return res.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch teacher matrix");
    }
  }
);

export const submitDeadline = createAsyncThunk(
  "deadline/submit",
  async ({ deadlineId, file }, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await axiosInstance.post(`/deadline/${deadlineId}/submit`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success(res.data.message || "Submitted successfully");
      return { deadlineId, submission: res.data.data.submission };
    } catch (error) {
      const message = error.response?.data?.message || "Failed to submit";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const unsubmitDeadline = createAsyncThunk(
  "deadline/unsubmit",
  async (deadlineId, thunkAPI) => {
    try {
      const res = await axiosInstance.post(`/deadline/${deadlineId}/unsubmit`);
      toast.success(res.data.message || "Unsubmitted successfully");
      return deadlineId;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to unsubmit";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const deadlineSlice = createSlice({
  name: "deadline",
  initialState: {
    deadlines: [], // For both student and teacher lists
    matrix: { deadlines: [], matrix: [] }, // For teacher tracking
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch student deadlines
      .addCase(fetchStudentDeadlines.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStudentDeadlines.fulfilled, (state, action) => {
        state.loading = false;
        state.deadlines = action.payload;
      })
      .addCase(fetchStudentDeadlines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch teacher deadlines
      .addCase(fetchTeacherDeadlines.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTeacherDeadlines.fulfilled, (state, action) => {
        state.loading = false;
        state.deadlines = action.payload;
      })
      .addCase(fetchTeacherDeadlines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create deadline
      .addCase(createDeadline.fulfilled, (state, action) => {
        state.deadlines.push(action.payload);
      })
      // Update deadline
      .addCase(updateDeadline.fulfilled, (state, action) => {
        const index = state.deadlines.findIndex((d) => d._id === action.payload._id);
        if (index !== -1) {
          state.deadlines[index] = action.payload;
        }
      })
      // Delete deadline
      .addCase(deleteDeadline.fulfilled, (state, action) => {
        state.deadlines = state.deadlines.filter((d) => d._id !== action.payload);
      })
      // Submit deadline
      .addCase(submitDeadline.fulfilled, (state, action) => {
        const { deadlineId, submission } = action.payload;
        const index = state.deadlines.findIndex((d) => d._id === deadlineId);
        if (index !== -1) {
          state.deadlines[index].submission = submission;
          state.deadlines[index].submissionStatus = "SUBMITTED";
        }
      })
      // Unsubmit deadline
      .addCase(unsubmitDeadline.fulfilled, (state, action) => {
        const deadlineId = action.payload;
        const index = state.deadlines.findIndex((d) => d._id === deadlineId);
        if (index !== -1) {
          state.deadlines[index].submission = null;
          state.deadlines[index].submissionStatus = "PENDING";
        }
      })
      // Fetch teacher matrix
      .addCase(fetchTeacherMatrix.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTeacherMatrix.fulfilled, (state, action) => {
        state.loading = false;
        state.matrix = action.payload;
      })
      .addCase(fetchTeacherMatrix.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default deadlineSlice.reducer;
