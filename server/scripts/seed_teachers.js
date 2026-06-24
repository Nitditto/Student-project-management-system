import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/user.js";

dotenv.config();

const teachersData = [
  {
    name: "GS.TS. Từ Minh Phương",
    experties: ["Operating Systems", "Artificial Intelligence", "Machine Learning"]
  },
  {
    name: "PGS.TS. Trần Quang Anh",
    experties: ["Web and Database Security", "Advanced Network Security"]
  },
  {
    name: "PGS.TSKH. Hoàng Đăng Hải",
    experties: ["Fundamentals of Information Security", "Management of Information Security"]
  },
  {
    name: "PGS.TS. Ngô Xuân Bách",
    experties: ["Artificial Intelligence", "Machine Learning", "Natural Language Processing", "Discrete Mathematics"]
  },
  {
    name: "PGS.TS. Phạm Văn Cường",
    experties: ["Computer Architecture", "Microprocessors", "Human – Computer Interaction"]
  },
  {
    name: "PGS.TS. Nguyễn Mạnh Hùng",
    experties: ["Web and Database Security", "Advanced Network Security"]
  },
  {
    name: "PGS.TS. Trần Đình Quế",
    experties: ["Analysis and Design of Information Systems", "Software Project Management", "Software Architecture and Design"]
  },
  {
    name: "PGS.TS. Nguyễn Quang Hoan",
    experties: ["Artificial Intelligence", "Machine Learning"]
  },
  {
    name: "PGS.TS. Hoàng Hữu Hạnh",
    experties: ["Information Retrieval", "Machine Learning"]
  },
  {
    name: "PGS.TS. Lê Hải Châu",
    experties: ["Operating Systems", "Data Structures and Algorithms"]
  },
  {
    name: "TS. Nguyễn Duy Phương",
    experties: ["Programming with C++", "Data Structures and Algorithms", "Object-Oriented Programming"]
  },
  {
    name: "TS. Ngô Quốc Dũng",
    experties: ["Web Programming", "Distributed Systems"]
  },
  {
    name: "TS. Nguyễn Trọng Khánh",
    experties: ["Network Programming", "Python Programming", "Service-oriented Software Development"]
  },
  {
    name: "TS. Đỗ Thị Bích Ngọc",
    experties: ["Programming with C++", "Software Quality Assurance", "Introduction to Software Engineering"]
  },
  {
    name: "TS. Đỗ Thị Liên",
    experties: ["Computer Networks", "Programming with C++"]
  },
  {
    name: "TS. Đặng Ngọc Phong",
    experties: ["Software Quality Assurance", "Analysis and Design of Information Systems"]
  },
  {
    name: "TS. Đặng Ngọc Hùng",
    experties: ["Network Programming", "Introduction to Software Engineering", "Service-oriented Software Development"]
  },
  {
    name: "TS. Nguyễn Đình Hoá",
    experties: ["Databases", "Distributed Databases"]
  },
  {
    name: "TS. Dương Trần Đức",
    experties: ["Web Programming", "Databases"]
  },
  {
    name: "TS. Phan Thị Hà",
    experties: ["Databases", "Distributed Databases", "Text Mining and Analytics"]
  },
  {
    name: "TS. Trần Tiến Công",
    experties: ["Web Programming", "Introduction to Data Science"]
  },
  {
    name: "TS. Đào Thị Thuý Quỳnh",
    experties: ["Discrete Mathematics", "Artificial Intelligence", "Image Processing", "Introduction to Data Science"]
  },
  {
    name: "TS. Vũ Văn Thoả",
    experties: ["Discrete Mathematics", "Data Structures and Algorithms"]
  },
  {
    name: "TS. Nguyễn Tất Thắng",
    experties: ["Discrete Mathematics", "Image Processing", "Mining Massive Data Sets"]
  },
  {
    name: "TS. Nguyễn Thị Thảo (ĐT)",
    experties: ["Digital Electronics", "Image Processing"]
  },
  {
    name: "TS. Đỗ Xuân Chợ",
    experties: ["Introduction to Cryptography", "Web and Database Security", "Advanced Network Security", "Penetration Testing"]
  },
  {
    name: "TS. Nguyễn Kiều Linh",
    experties: ["Discrete Mathematics", "Introduction to Data Science", "Machine Learning"]
  },
  {
    name: "TS. Nguyễn Quý Sỹ",
    experties: ["Computer Architecture", "Microprocessors"]
  },
  {
    name: "TS. Nguyễn Mạnh Sơn",
    experties: ["Introduction to Computing and Programming", "Object-Oriented Programming", "Data Structures and Algorithms"]
  },
  {
    name: "TS. Nguyễn Văn Tiến",
    experties: ["Introduction to Computing and Programming", "Programming with C++", "Data Structures and Algorithms"]
  },
  {
    name: "ThS. Nguyễn Thị Thanh Thuỷ",
    experties: ["Databases", "Computer Networks", "Software Project Management"]
  },
  {
    name: "ThS. Nguyễn Quỳnh Chi",
    experties: ["Software Project Management", "Analysis and Design of Information Systems"]
  },
  {
    name: "ThS (NCS). Nguyễn Hoài Nam",
    experties: ["Introduction to Data Science", "Introduction to Deep Learning", "Embedded System Development"]
  },
  {
    name: "ThS. Đinh Xuân Trường",
    experties: ["Computer Architecture", "Microprocessors", "Operating Systems"]
  },
  {
    name: "ThS. Nguyễn Thị Trang",
    experties: ["Discrete Mathematics", "Artificial Intelligence", "Natural Language Processing", "Text Mining and Analytics"]
  },
  {
    name: "ThS. Vũ Hoài Thư",
    experties: ["Discrete Mathematics", "Introduction to Deep Learning", "Information Retrieval"]
  },
  {
    name: "ThS. Nguyễn Hải Dũng",
    experties: ["Web Programming", "Mobile Application Development"]
  },
  {
    name: "ThS. Nguyễn Đình Hiến",
    experties: ["Introduction to Computing and Programming", "Programming with C++"]
  },
  {
    name: "ThS. Nguyễn Hoàng Anh",
    experties: ["Python Programming", "Mobile Application Development"]
  },
  {
    name: "ThS. Trịnh Thị Vân Anh",
    experties: ["Object-Oriented Programming", "Mobile Application Development"]
  },
  {
    name: "ThS. Nguyễn Xuân Anh",
    experties: ["Databases", "Distributed Systems"]
  }
];

const cleanName = (name) => {
  return name
    .replace(/^(GS\.TS\.|PGS\.TS\.|PGS\.TSKH\.|TS\.|ThS\.|ThS\s*\(NCS\)\.)\s*/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, m => m.toLowerCase() === 'đ' ? 'd' : 'D')
    .replace(/[^a-zA-Z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const run = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      console.error("MONGO_URL not found in .env");
      process.exit(1);
    }

    console.log("Connecting to Database...");
    await mongoose.connect(mongoUrl, {
      dbName: "fyp_management_system"
    });
    console.log("Connected successfully!");

    // 1. Fetch all existing teachers
    const dbTeachers = await User.find({ role: "Teacher" });
    const teacherMap = new Map();

    dbTeachers.forEach(teacher => {
      const normalized = cleanName(teacher.name);
      teacherMap.set(normalized, teacher);
      console.log(`Mapped existing teacher: "${teacher.name}" -> normalized: "${normalized}"`);
    });

    // Helper to find next available sequential email (teacherX@gmail.com)
    let emailCounter = 1;
    const findNextAvailableEmail = async () => {
      while (true) {
        const email = `teacher${emailCounter}@gmail.com`;
        const exists = await User.findOne({ email });
        if (!exists) {
          emailCounter++; // advance for next call
          return email;
        }
        emailCounter++;
      }
    };

    console.log("\nStarting import/update process...");

    for (const rawTeacher of teachersData) {
      const normalized = cleanName(rawTeacher.name);
      const matchedTeacher = teacherMap.get(normalized);

      if (matchedTeacher) {
        // Update existing teacher name and merge experties
        const oldName = matchedTeacher.name;
        const mergedExpertiesSet = new Set([
          ...(matchedTeacher.experties || []),
          ...rawTeacher.experties
        ]);

        matchedTeacher.name = rawTeacher.name;
        matchedTeacher.experties = Array.from(mergedExpertiesSet);
        matchedTeacher.isActive = true; // Ensure they are active

        await matchedTeacher.save();
        console.log(`[UPDATE] "${oldName}" -> "${rawTeacher.name}" | Experties merged: ${JSON.stringify(matchedTeacher.experties)}`);
      } else {
        // Create new teacher
        const newEmail = await findNextAvailableEmail();
        const newTeacher = new User({
          name: rawTeacher.name,
          email: newEmail,
          password: "12345678", // Default password
          role: "Teacher",
          experties: rawTeacher.experties,
          isActive: true
        });

        await newTeacher.save();
        console.log(`[CREATE] "${rawTeacher.name}" | Email: "${newEmail}" | Experties: ${JSON.stringify(rawTeacher.experties)}`);
      }
    }

    console.log("\nImport and update completed successfully!");

  } catch (err) {
    console.error("Error during execution:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database.");
  }
};

void run();
