import { Project } from '../models/project.js';
import { User } from '../models/user.js';

export const canChatWithEachOther = async (user1Id, user2Id) => {
    try {
        const user1 = await User.findById(user1Id);
        const user2 = await User.findById(user2Id);

        if (!user1 || !user2) return false;

        const isUser1Teacher = user1.role === 'Teacher';
        const isUser2Teacher = user2.role === 'Teacher';

        // TH1: Cả 2 đều là học sinh -> Kiểm tra xem có chung một Project
        if (!isUser1Teacher && !isUser2Teacher) {
            const sharedProject = await Project.findOne({
                members: { $all: [user1Id, user2Id] }
            });
            return !!sharedProject;
        }

        // TH2: 1 người là Giảng viên, 1 người là Học sinh
        let teacherId = isUser1Teacher ? user1Id : user2Id;
        let studentId = isUser1Teacher ? user2Id : user1Id;

        // Tìm Project mà sinh viên này là thành viên VÀ giảng viên kia là supervisor
        const validProject = await Project.findOne({
            members: studentId,
            supervisor: teacherId,
        });

        return !!validProject;
    } catch (error) {
        console.error("Error in canChatWithEachOther validation:", error);
        return false;
    }
};
