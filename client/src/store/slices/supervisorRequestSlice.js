import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

export const createSupervisorRequest = createAsyncThunk(
  "supervisorRequest/createSupervisorRequest",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(
        "/supervisor-request/create-supervisor-request",
        data
      );
      toast.success(res.data.message || "Supervisor request created successfully");
      return res.data.data.request;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create supervisor request"
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to create supervisor request"
      );
    }
  }
);

export const fetchTeacherRequests = createAsyncThunk(
  "supervisorRequest/fetchTeacherRequests",
  async (status = "", { rejectWithValue }) => {
    try {
      const query = status ? `?status=${status}` : "";
      const res = await axiosInstance.get(
        `/supervisor-request/teacher-requests${query}`
      );
      return res.data.data.requests;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch teacher requests"
      );
    }
  }
);

export const fetchGroupRequests = createAsyncThunk(
  "supervisorRequest/fetchGroupRequests",
  async (groupId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(
        `/supervisor-request/group-requests/${groupId}`
      );
      return res.data.data.requests;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch group requests"
      );
    }
  }
);

export const approveSupervisorRequest = createAsyncThunk(
  "supervisorRequest/approveSupervisorRequest",
  async ({ requestId, projectPayload }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(
        `/supervisor-request/approve-supervisor-request/${requestId}`,
        { projectPayload }
      );
      toast.success(res.data.message || "Supervisor request approved successfully");
      return res.data.data;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to approve supervisor request"
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to approve supervisor request"
      );
    }
  }
);

export const rejectSupervisorRequest = createAsyncThunk(
  "supervisorRequest/rejectSupervisorRequest",
  async ({ requestId, reason }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(
        `/supervisor-request/reject-supervisor-request/${requestId}`,
        { reason }
      );
      toast.success(res.data.message || "Supervisor request rejected successfully");
      return res.data.data.request;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to reject supervisor request"
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to reject supervisor request"
      );
    }
  }
);

export const cancelSupervisorRequest = createAsyncThunk(
  "supervisorRequest/cancelSupervisorRequest",
  async (requestId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(
        `/supervisor-request/cancel-supervisor-request/${requestId}`
      );
      toast.success(res.data.message || "Supervisor request cancelled successfully");
      return res.data.data.request;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to cancel supervisor request"
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to cancel supervisor request"
      );
    }
  }
);

const supervisorRequestSlice = createSlice({
  name: "supervisorRequest",
  initialState: {
    teacherRequests: [],
    groupRequests: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearSupervisorRequestError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createSupervisorRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSupervisorRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.groupRequests.unshift(action.payload);
      })
      .addCase(createSupervisorRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchTeacherRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeacherRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.teacherRequests = action.payload || [];
      })
      .addCase(fetchTeacherRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchGroupRequests.fulfilled, (state, action) => {
        state.groupRequests = action.payload || [];
      })

      .addCase(approveSupervisorRequest.fulfilled, (state, action) => {
        state.teacherRequests = state.teacherRequests.map((req) =>
          req._id === action.meta.arg.requestId
            ? { ...req, status: "approved" }
            : req
        );
      })

      .addCase(rejectSupervisorRequest.fulfilled, (state, action) => {
        state.teacherRequests = state.teacherRequests.map((req) =>
          req._id === action.payload._id ? action.payload : req
        );
      })

      .addCase(cancelSupervisorRequest.fulfilled, (state, action) => {
        state.groupRequests = state.groupRequests.map((req) =>
          req._id === action.payload._id ? action.payload : req
        );
      });
  },
});

export const { clearSupervisorRequestError } =
  supervisorRequestSlice.actions;
export default supervisorRequestSlice.reducer;