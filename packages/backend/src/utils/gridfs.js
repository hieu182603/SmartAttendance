import mongoose from "mongoose";

// ─── GridFS Utility ──────────────────────────────────────────────────────────
// Thin wrapper around mongoose.mongo.GridFSBucket for regulation file storage.
// Bucket name: "regulation_files" → MongoDB creates two collections:
//   regulation_files.files   (metadata)
//   regulation_files.chunks  (binary data in 255 KB pieces)

let _bucket = null;

/**
 * Get or create the GridFS bucket (lazy singleton).
 * Must be called AFTER mongoose has connected.
 */
export function getGridFSBucket() {
  if (!_bucket) {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error(
        "GridFS bucket requested before MongoDB connection is ready."
      );
    }
    _bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: "regulation_files",
    });
  }
  return _bucket;
}

/**
 * Upload an in-memory buffer into GridFS.
 *
 * @param {Buffer}  buffer   - File content
 * @param {string}  filename - Original file name (stored in GridFS metadata)
 * @param {Object}  metadata - Extra metadata (companyId, mimeType, uploadedBy, …)
 * @returns {Promise<import("mongoose").Types.ObjectId>} GridFS file _id
 */
export function uploadToGridFS(buffer, filename, metadata = {}) {
  const bucket = getGridFSBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, { metadata });
    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.on("error", reject);
    uploadStream.end(buffer);
  });
}

/**
 * Open a readable stream from GridFS by file _id.
 *
 * @param {string|import("mongoose").Types.ObjectId} fileId
 * @returns {import("stream").Readable}
 */
export function downloadStreamFromGridFS(fileId) {
  const bucket = getGridFSBucket();
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
}

/**
 * Delete a file (and its chunks) from GridFS.
 *
 * @param {string|import("mongoose").Types.ObjectId} fileId
 * @returns {Promise<void>}
 */
export async function deleteFromGridFS(fileId) {
  const bucket = getGridFSBucket();
  await bucket.delete(new mongoose.Types.ObjectId(fileId));
}
