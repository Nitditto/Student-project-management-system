import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

export const createGroup = createAsyncThunk(
  "group/createGroup",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/group/create-group", data);
      toast.success(res.data.message || "Group created successfully");
      return res.data.data.group;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      return rejectWithValue(
        error.response?.data?.message || "Failed to create group"
      );
    }
  }
);

export const fetchMyGroup = createAsyncThunk(
  "group/fetchMyGroup",
  async (registrationPeriodId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(
        `/group/my-group?registrationPeriodId=${registrationPeriodId}`
      );
      return res.data.data.group;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch my group"
      );
    }
  }
);

export const fetchMyInvitations = createAsyncThunk(
  "group/fetchMyInvitations",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/group/my-invitations");
      return res.data.data.invitations;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch invitations"
      );
    }
  }
);

export const inviteMember = createAsyncThunk(
  "group/inviteMember",
  async ({ groupId, studentId }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(`/group/invite-member/${groupId}`, {
        studentId,
      });
      toast.success(res.data.message || "Invitation sent successfully");
      return res.data.data.invitation;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to invite member");
      return rejectWithValue(
        error.response?.data?.message || "Failed to invite member"
      );
    }
  }
);

export const acceptInvitation = createAsyncThunk(
  "group/acceptInvitation",
  async (invitationId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(
        `/group/accept-invitation/${invitationId}`
      );
      toast.success(res.data.message || "Invitation accepted successfully");
      return res.data.data.group;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept invitation");
      return rejectWithValue(
        error.response?.data?.message || "Failed to accept invitation"
      );
    }
  }
);

export const rejectInvitation = createAsyncThunk(
  "group/rejectInvitation",
  async (invitationId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(
        `/group/reject-invitation/${invitationId}`
      );
      toast.success(res.data.message || "Invitation rejected successfully");
      return res.data.data.invitation;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject invitation");
      return rejectWithValue(
        error.response?.data?.message || "Failed to reject invitation"
      );
    }
  }
);

export const submitGroup = createAsyncThunk(
  "group/submitGroup",
  async (groupId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(`/group/submit-group/${groupId}`);
      toast.success(res.data.message || "Group submitted successfully");
      return res.data.data.group;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit group");
      return rejectWithValue(
        error.response?.data?.message || "Failed to submit group"
      );
    }
  }
);

export const removeMember = createAsyncThunk(
  "group/removeMember",
  async ({ groupId, studentId }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.delete(
        `/group/remove-member/${groupId}/${studentId}`
      );
      toast.success(res.data.message || "Member removed successfully");
      return res.data.data.group;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
      return rejectWithValue(
        error.response?.data?.message || "Failed to remove member"
      );
    }
  }
);

const groupSlice = createSlice({
  name: "group",
  initialState: {
    myGroup: null,
    invitations: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearGroupError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.myGroup = action.payload;
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchMyGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.myGroup = action.payload;
      })
      .addCase(fetchMyGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchMyInvitations.fulfilled, (state, action) => {
        state.invitations = action.payload || [];
      })

      .addCase(inviteMember.fulfilled, (state) => {
        state.loading = false;
      })

      .addCase(acceptInvitation.fulfilled, (state, action) => {
        state.myGroup = action.payload;
        state.invitations = state.invitations.filter(
          (inv) => inv._id !== action.meta.arg
        );
      })

      .addCase(rejectInvitation.fulfilled, (state, action) => {
        state.invitations = state.invitations.filter(
          (inv) => inv._id !== action.payload._id
        );
      })

      .addCase(submitGroup.fulfilled, (state, action) => {
        state.myGroup = action.payload;
      })

      .addCase(removeMember.fulfilled, (state, action) => {
        state.myGroup = action.payload;
      });
  },
});

export const { clearGroupError } = groupSlice.actions;
export default groupSlice.reducer;