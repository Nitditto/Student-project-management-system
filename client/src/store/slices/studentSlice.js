import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

export const submitProjectProposal = createAsyncThunk(
  "student/submitProjectProposal",
  async (data, thunkAPI) => {
    try {
      const response = await axiosInstance.post(
        "/student/project-proposal",
        data,
      );
      toast.success("Project proposal submitted successfully");
      return response.data.data?.project || response.data.data || response.data;
    } catch (error) {
      toast.error(
        error.response.data.message || "Failed to submit project proposal",
      );
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const fetchProject = createAsyncThunk(
  "student/fetchProject",
  async (_, thunkAPI) => {
    try {
      const response = await axiosInstance.get("/student/project");
      return response.data.data?.project;
    } catch (error) {
      toast.error(error.response.data.message || "Failed to fetch project");
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const getSupervisor = createAsyncThunk(
  "student/getSupervisor",
  async (_, thunkAPI) => {
    try {
      const response = await axiosInstance.get("/student/supervisor");
      return response.data.data?.supervisor;
    } catch (error) {
      toast.error(error.response.data.message || "Failed to fetch supervisor");
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const fetchAllSupervisors = createAsyncThunk(
  "student/fetchAllSupervisors",
  async (_, thunkAPI) => {
    try {
      const response = await axiosInstance.get("/student/fetch-supervisors");
      return response.data.data?.supervisors;
    } catch (error) {
      toast.error(
        error.response.data.message || "Failed to fetch available supervisors",
      );
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const requestSupervisor = createAsyncThunk(
  "student/requestSupervisor",
  async (data, thunkAPI) => {
    try {
      const response = await axiosInstance.post(
        "/student/request-supervisor",
        data,
      );
      thunkAPI.dispatch(getSupervisor());
      toast.success(response.data.message);
      return response.data.data?.request;
    } catch (error) {
      toast.error(
        error.response.data.message || "Failed to fetch available supervisors",
      );
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const uploadFiles = createAsyncThunk(
  "student/uploadFiles",
  async ({ projectId, files }, thunkAPI) => {
    try {
      const form = new FormData();
      for (const file of files) form.append("files", file);
      const res = await axiosInstance.post(
        `/student/upload/${projectId}`,
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      toast.success(res.data.message || "File uploaded successfully");
      return res.data.data.project || res.data;
    } catch (error) {
      toast.error(error.response.data.message || "Failed to upload files");
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const fetchDashboardStats = createAsyncThunk(
  "fetchDashboardStats",
  async (_, thunkAPI) => {
    try {
      const response = await axiosInstance.get(
        "/student/fetch-dashboard-stats",
      );
      return response.data.data || response.data;
    } catch (error) {
      toast.error(
        error.response.data.message ||
          "Failed to fetch student dashboard stats",
      );
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const getFeedback = createAsyncThunk(
  "getFeedback",
  async ({ projectId }, thunkAPI) => {
    try {
      const response = await axiosInstance.get(
        `/student/feedback/${projectId}`,
      );
      return (
        response.data.data?.feedback || response.data.data || response.data
      );
    } catch (error) {
      toast.error(error.response.data.message || "Failed to fetch feedback");
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const downloadFile = createAsyncThunk(
  "downloadFile",
  async ({ projectId, fileId }, thunkAPI) => {
    try {
      const response = await axiosInstance.get(
        `/student/download/${projectId}/${fileId}`,
        {
          responseType: "blob",
        },
      );
      return { blob: response.data, projectId, fileId };
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to download file");
      return thunkAPI.rejectWithValue(error.response?.data?.message);
    }
  },
);

const studentSlice = createSlice({
  name: "student",
  initialState: {
    project: null,
    files: [],
    supervisors: [],
    dashboardStats: [],
    supervisor: null,
    deadlines: [],
    feedback: [],
    status: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(submitProjectProposal.fulfilled, (state, action) => {
        state.project = action.payload?.project || action.payload;
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        state.project = action.payload?.project || action.payload || null;
        state.files = action.payload?.files || [];
      })
      .addCase(getSupervisor.fulfilled, (state, action) => {
        state.supervisor = action.payload?.supervisor || action.payload || null;
      })
      .addCase(fetchAllSupervisors.fulfilled, (state, action) => {
        state.supervisors = action.payload?.supervisors || action.payload || [];
      })
      .addCase(uploadFiles.fulfilled, (state, action) => {
        // const newFiles = action.payload?.project?.files || action.payload || [];
        // state.files = [...state.files, ...newFiles];
        state.project = action.payload;
      })
      .addCase(getFeedback.fulfilled, (state, action) => {
        state.feedback = action.payload || [];
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.dashboardStats = action.payload || [];
      });
  },
});

export default studentSlice.reducer;
