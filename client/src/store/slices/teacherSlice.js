import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

export const getTeacherDashboardStats = createAsyncThunk(
  "getTeacherDashboardStats",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get("/teacher/fetch-dashboard-stats");
      return res.data.data?.dashboardStats || res.data.data;
    } catch (error) {
      toast.error(
        error.response.data.message || "Failed to get teacher dashboard stats",
      );
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const getTeacherRequests = createAsyncThunk(
  "getTeacherRequests",
  async (supervisorId, thunkAPI) => {
    try {
      const res = await axiosInstance.get(
        `/teacher/requests?supervisor=${supervisorId}`,
      );
      return res.data.data?.requests || res.data.data;
    } catch (error) {
      toast.error(
        error.response.data.message || "Failed to get teacher requests",
      );
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const acceptRequest = createAsyncThunk(
  "acceptRequest",
  async (requestId, thunkAPI) => {
    try {
      const res = await axiosInstance.put(
        `/teacher/requests/${requestId}/accept`,
      );
      toast.success(res.data.message || "Request accepted successfully");
      return res.data.data?.request || res.data.data;
    } catch (error) {
      toast.error(error.response.data.message || "Failed to accept request");
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const rejectRequest = createAsyncThunk(
  "rejectRequest",
  async (requestId, thunkAPI) => {
    try {
      const res = await axiosInstance.put(
        `/teacher/requests/${requestId}/reject`,
      );
      toast.success(res.data.message || "Request rejected successfully");
      return res.data.data?.request || res.data.data;
    } catch (error) {
      toast.error(error.response.data.message || "Failed to reject request");
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

const teacherSlice = createSlice({
  name: "teacher",
  initialState: {
    assignedStudents: [],
    files: [],
    pendingRequests: [],
    dashboardStats: null,
    loading: false,
    error: null,
    list: [],
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getTeacherDashboardStats.fulfilled, (state, action) => {
      state.dashboardStats = action.payload;
    });
    builder.addCase(getTeacherRequests.fulfilled, (state, action) => {
      state.pendingRequests = action.payload?.requests || action.payload;
    });
    builder.addCase(acceptRequest.fulfilled, (state, action) => {
      const updatedRequest = action.payload;
      state.pendingRequests = state.pendingRequests.map((request) =>
        request._id === updatedRequest._id ? updatedRequest : request,
      );
    });
    builder.addCase(rejectRequest.fulfilled, (state, action) => {
      const rejectedRequest = action.payload;
      state.pendingRequests = state.pendingRequests.filter(
        (request) => request._id !== rejectedRequest._id,
      );
    });
  },
});

export default teacherSlice.reducer;
