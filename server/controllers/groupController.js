import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import { ProjectGroup } from "../models/projectGroup.js";
import GroupInvitation from "./groupInvitation.js";
import * as groupServices from "../services/groupService.js";

export const createGroup = asyncHandler(async (req, res, next) => {
    const { registrationPeriodId, name } = req.body;

    if (!registrationPeriodId || !name) {
        return next(new ErrorHandler("Please provide registrationPeriodId and group name", 400));
    }

    const group = await groupServices.createGroup({
        registrationPeriodId,
        name,
        leaderId: req.user._id,
    });

    res.status(201).json({
        success: true,
        message: "Group created successfully",
        data: {
            group,
        },
    });
});

export const inviteMember = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    const { studentId } = req.body;

    if (!groupId || !studentId) {
        return next(new ErrorHandler("Please provide groupId and studentId", 400));
    }

    const invitation = await groupServices.inviteMember({
        groupId,
        leaderId: req.user._id,
        studentId,
    });

    res.status(201).json({
        success: true,
        message: "Invitation sent successfully",
        data: {
            invitation,
        },
    });
});

export const acceptInvitation = asyncHandler(async (req, res, next) => {
    const { invitationId } = req.params;

    if (!invitationId) {
        return next(new ErrorHandler("Invitation id is required", 400));
    }

    const group = await groupServices.acceptInvitation({
        invitationId,
        studentId: req.user._id,
    });

    res.status(200).json({
        success: true,
        message: "Invitation accepted successfully",
        data: {
            group,
        },
    });
});

export const rejectInvitation = asyncHandler(async (req, res, next) => {
    const { invitationId } = req.params;

    if (!invitationId) {
        return next(new ErrorHandler("Invitation id is required", 400));
    }

    const invitation = await groupServices.rejectInvitation({
        invitationId,
        studentId: req.user._id,
    });

    res.status(200).json({
        success: true,
        message: "Invitation rejected successfully",
        data: {
            invitation,
        },
    });
});

export const removeMember = asyncHandler(async (req, res, next) => {
    const { groupId, studentId } = req.params;

    if (!groupId || !studentId) {
        return next(new ErrorHandler("Please provide groupId and studentId", 400));
    }

    const group = await groupServices.removeMember({
        groupId,
        leaderId: req.user._id,
        studentId,
    });

    res.status(200).json({
        success: true,
        message: "Member removed successfully",
        data: {
            group,
        },
    });
});

export const getMyGroup = asyncHandler(async (req, res, next) => {
    const { registrationPeriodId } = req.query;

    if (!registrationPeriodId) {
        return next(new ErrorHandler("registrationPeriodId is required", 400));
    }

    const group = await groupServices.getMyGroup({
        registrationPeriodId,
        studentId: req.user._id,
    });

    res.status(200).json({
        success: true,
        message: "My group fetched successfully",
        data: {
            group,
        },
    });
});

export const getMyInvitations = asyncHandler(async (req, res, next) => {
    const invitations = await groupServices.getMyInvitations({
        studentId: req.user._id,
    });

    res.status(200).json({
        success: true,
        message: "Invitations fetched successfully",
        data: {
            invitations,
        },
    });
});

export const submitGroup = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;

    if (!groupId) {
        return next(new ErrorHandler("Group id is required", 400));
    }

    const group = await groupServices.submitGroup({
        groupId,
        leaderId: req.user._id,
    });

    res.status(200).json({
        success: true,
        message: "Group submitted successfully",
        data: {
            group,
        },
    });
});