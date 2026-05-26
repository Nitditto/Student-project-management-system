import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_NAME = "fyp_management_system";

const OBSOLETE_COLLECTIONS = [
  "cohorts",
  "cohortstudents",
  "cohortteachers",
  "councils",
  "milestones",
  "projectgroups",
  "registrationperiods",
  "requests",
  "studentassessments",
];

const LEGACY_FIELD_CLEANUPS = [
  {
    collection: "messages",
    filter: { read: { $exists: true } },
    unset: { read: "" },
    reason: "Legacy read flag replaced by readBy array.",
  },
  {
    collection: "projects",
    filter: {
      $or: [
        { createdFromRequest: { $exists: true } },
        { group: { $exists: true } },
        { registrationPeriod: { $exists: true } },
        { type: { $exists: true } },
      ],
    },
    unset: {
      createdFromRequest: "",
      group: "",
      registrationPeriod: "",
      type: "",
    },
    reason: "Legacy project fields no longer exist in the current schema.",
  },
  {
    collection: "users",
    filter: { isActive: { $exists: true } },
    unset: { isActive: "" },
    reason: "Legacy activation flag is not used by the current user schema.",
  },
];

const LEGACY_DOCUMENT_CLEANUPS = [
  {
    collection: "deadlines",
    filter: {
      dueDate: { $exists: true },
      teacherId: { $exists: false },
      endDate: { $exists: false },
    },
    reason:
      "Legacy deadline documents use name/dueDate/createdBy and are unreachable by the current deadline flows.",
  },
];

const shouldApply = process.argv.includes("--apply");

const print = (message) => {
  process.stdout.write(`${message}\n`);
};

const main = async () => {
  await mongoose.connect(process.env.MONGO_URL, { dbName: DB_NAME });
  const db = mongoose.connection.db;

  print(`Mode: ${shouldApply ? "APPLY" : "DRY_RUN"}`);
  print(`Database: ${DB_NAME}`);

  const existingCollections = new Set(
    (await db.listCollections().toArray()).map(({ name }) => name),
  );

  for (const collectionName of OBSOLETE_COLLECTIONS) {
    if (!existingCollections.has(collectionName)) {
      print(`[SKIP] collection ${collectionName} does not exist`);
      continue;
    }

    const count = await db.collection(collectionName).countDocuments();
    if (!shouldApply) {
      print(`[DROP] collection ${collectionName} documents=${count}`);
      continue;
    }

    await db.collection(collectionName).drop();
    print(`[DONE] dropped collection ${collectionName} documents=${count}`);
  }

  for (const cleanup of LEGACY_FIELD_CLEANUPS) {
    const collection = db.collection(cleanup.collection);
    const count = await collection.countDocuments(cleanup.filter);
    if (!shouldApply) {
      print(
        `[UNSET] ${cleanup.collection} matched=${count} fields=${Object.keys(cleanup.unset).join(", ")} reason="${cleanup.reason}"`,
      );
      continue;
    }

    const result = await collection.updateMany(cleanup.filter, {
      $unset: cleanup.unset,
    });
    print(
      `[DONE] unset legacy fields in ${cleanup.collection} matched=${result.matchedCount} modified=${result.modifiedCount}`,
    );
  }

  for (const cleanup of LEGACY_DOCUMENT_CLEANUPS) {
    const collection = db.collection(cleanup.collection);
    const count = await collection.countDocuments(cleanup.filter);
    if (!shouldApply) {
      print(
        `[DELETE] ${cleanup.collection} matched=${count} reason="${cleanup.reason}"`,
      );
      continue;
    }

    const result = await collection.deleteMany(cleanup.filter);
    print(
      `[DONE] deleted legacy documents in ${cleanup.collection} deleted=${result.deletedCount}`,
    );
  }

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
