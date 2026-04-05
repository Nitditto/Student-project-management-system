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
      thunkAPI.dispatch(getSupervisor())
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
  async ({projectId, files}, thunkAPI) => {
    try {
      const form = new FormData();
      for(const file of files) form.append("files",file);
      const res = await axiosInstance.post(`/student/upload/${projectId}`,form, {
        headers: {
          "Content-Type": "multipart/form-data",
        }
      })
      toast.success(res.data.message || "File uploaded successfully");
      return res.data.data.project || res.data
    } catch (error) {
      toast.error(
        error.response.data.message || "Failed to upload files",
      );
      return thunkAPI.rejectWithValue(error.response.data.message);
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
      })
      .addCase(getSupervisor.fulfilled, (state, action) => {
        state.supervisor = action.payload?.supervisor || action.payload || null;
      })
      .addCase(fetchAllSupervisors.fulfilled, (state, action) => {
        state.supervisors = action.payload?.supervisors || action.payload || [];
      })
      .addCase(uploadFiles.fulfilled, (state, action) => {
        const newFiles = action.payload?.files || action.payload || [];
        state.files = [...state.files, ...newFiles];
        
      });
  },
});

export default studentSlice.reducer;
