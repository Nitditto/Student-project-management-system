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

export const addFeedback = createAsyncThunk(
  "addFeedback",
  async ({ projectId, feedback }, thunkAPI) => {
    try {
      const res = await axiosInstance.post(
        `/teacher/feedback/${projectId}`,
        feedback,
      );
      toast.success(res.data.message || "Feedback added successfully");
      return {
        projectId,
        feedback: res.data.data?.feedback || res.data.data || res.data,
      };
    } catch (error) {
      toast.error(error.response.data.message || "Failed to add feedback");
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const markComplete = createAsyncThunk(
  "markComplete",
  async (projectId, thunkAPI) => {
    try {
      const res = await axiosInstance.post(
        `/teacher/mark-complete/${projectId}`,
      );
      toast.success(res.data.message || "Project marked as complete");
      return { projectId };
    } catch (error) {
      toast.error(
        error.response.data.message || "Failed to mark project as complete",
      );
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const getAssignedStudents = createAsyncThunk(
  "getAssignedStudents",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get("/teacher/assigned-students");
      return res.data.data?.students || res.data.data || res.data;
    } catch (error) {
      toast.error(
        error.response.data.message || "Failed to get assigned students",
      );
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const downloadTeacherFile = createAsyncThunk(
  "downloadTeacherFile",
  async ({ projectId, fileId }, thunkAPI) => {
    try {
      const res = await axiosInstance.get(
        `/teacher/download/${projectId}/${fileId}`,
        {
          responseType: "blob",
        },
      );
      return { blob: res.data, projectId, fileId };
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to download file");
      return thunkAPI.rejectWithValue(error.response?.data?.message);
    }
  },
);

export const getFiles = createAsyncThunk(
  "getTeacherFiles",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get(`/teacher/files`);
      return res.data?.data?.files || res.data.data || res.data;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch teacher files",
      );
      return thunkAPI.rejectWithValue(error.response?.data?.message);
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
    builder.addCase(getAssignedStudents.pending, (state, action) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getAssignedStudents.fulfilled, (state, action) => {
      state.loading = false;
      state.assignedStudents = action.payload?.students || action.payload || [];
    });
    builder.addCase(getAssignedStudents.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || "Failed to fetch assigned students";
    });

    // builder.addCase(addFeedback.fulfilled, (state, action) => {
    //   const { projectId, feedback } = action.payload;
    //   state.assignedStudents = state.assignedStudents.map((student) =>
    //     student.project?._id === projectId ? { ...student, feedback } : student,
    //   // student.projectId === projectId ? { ...student, feedback } : student,
    //   );
    // });

    builder.addCase(addFeedback.fulfilled, (state, action) => {
      const { projectId, feedback } = action.payload;
      state.assignedStudents = state.assignedStudents.map((student) => {
        if (student.project?._id === projectId) {
          return {
            ...student,
            project: {
              ...student.project,
              feedback: [...(student.project.feedback || []), feedback],
            },
          };
        }
        return student;
      });
    });

    builder.addCase(markComplete.fulfilled, (state, action) => {
      const { projectId } = action.payload;
      state.assignedStudents = state.assignedStudents.map((student) => {
        //if (student.project._id === projectId) {
        if (student.project?._id === projectId) {
          return {
            ...student,
            project: { ...student.project, status: "completed" },
          };
        }
        return student;
      });
    });

    builder.addCase(getTeacherDashboardStats.fulfilled, (state, action) => {
      state.dashboardStats = action.payload;
    });
    builder.addCase(getFiles.fulfilled, (state, action) => {
      state.files = action.payload?.files || action.payload || [];
    });
    builder.addCase(getTeacherRequests.fulfilled, (state, action) => {
      const requests = action.payload?.requests || action.payload;
      state.pendingRequests = requests;
      state.list = requests;
    });
    builder.addCase(acceptRequest.fulfilled, (state, action) => {
      const updatedRequest = action.payload;
      state.list = state.list.map((request) =>
        request._id === updatedRequest._id
          ? { ...request, status: "accepted" }
          : request,
      );
    });
    builder.addCase(rejectRequest.fulfilled, (state, action) => {
      const rejectedRequest = action.payload;
      state.list = state.list.filter(
        (request) => request._id !== rejectedRequest._id,
      );
    });
  },
});

export default teacherSlice.reducer;
