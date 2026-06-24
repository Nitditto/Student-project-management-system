import { createClient } from "@supabase/supabase-js";

globalThis.WebSocket = class {};

const supabaseUrl = "https://hpdawrdhtdtybpxhozcz.supabase.co";
const supabaseKey = "sb_secret_K_G4-3FD6aaHmOKjfGJQRA_8I9-aMBb";
const bucketName = "Student_Management";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

async function run() {
  console.log(`Checking if bucket "${bucketName}" exists...`);
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    const exists = buckets.some(b => b.name === bucketName);
    if (!exists) {
      console.log(`Creating bucket "${bucketName}"...`);
      const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: null, // Allow all
        fileSizeLimit: null     // No limit
      });
      if (createError) throw createError;
      console.log(`Bucket "${bucketName}" created successfully!`);
    } else {
      console.log(`Bucket "${bucketName}" already exists.`);
    }

    console.log("Uploading test file...");
    const buffer = Buffer.from("Test upload from automation script");
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(`tests/test-${Date.now()}.txt`, buffer, {
        contentType: "text/plain",
        upsert: true
      });
    if (uploadError) throw uploadError;
    console.log("Upload SUCCESSFUL!");
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}

run();
