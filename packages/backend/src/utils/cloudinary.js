import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload face image to Cloudinary
 * @param {string|Buffer} filePathOrBuffer - File path or buffer
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadFaceImage(filePathOrBuffer) {
  try {
    let uploadOptions = {
      folder: 'faces', // Separate folder for face images
      resource_type: 'image',
      allowed_formats: ['jpg', 'png', 'jpeg'],
      access_mode: 'authenticated', // Restrict public access
    };

    let result;

    // If it's a Buffer, convert to stream
    if (Buffer.isBuffer(filePathOrBuffer)) {
      // Convert Buffer to stream for Cloudinary
      const stream = Readable.from(filePathOrBuffer);
      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.pipe(uploadStream);
      });
    } else {
      // If it's a string path, use regular upload
      result = await cloudinary.uploader.upload(filePathOrBuffer, uploadOptions);
    }
    return { url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    throw new Error(`Failed to upload face image: ${error.message}`);
  }
}

/**
 * Delete face image from Cloudinary
 * @param {string} publicId - Cloudinary public ID of the image
 * @returns {Promise<{result: string}>}
 */
export async function deleteFaceImage(publicId) {
  try {
    if (!publicId) {
      throw new Error("Public ID is required for deletion");
    }
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true, // Invalidate CDN cache
    });
    
    if (result.result === 'not found') {
      // Image doesn't exist, but that's okay - already deleted
      return { result: 'deleted', publicId };
    }
    
    return { result: result.result, publicId };
  } catch (error) {
    throw new Error(`Failed to delete face image: ${error.message}`);
  }
}

/**
 * Delete multiple face images from Cloudinary
 * @param {string[]} publicIds - Array of Cloudinary public IDs
 * @returns {Promise<Array<{result: string, publicId: string}>>}
 */
export async function deleteFaceImages(publicIds) {
  if (!publicIds || publicIds.length === 0) {
    return [];
  }
  
  const results = [];
  for (const publicId of publicIds) {
    try {
      const result = await deleteFaceImage(publicId);
      results.push(result);
    } catch (error) {
      // Log error but continue with other deletions
      console.error(`Failed to delete image ${publicId}:`, error.message);
      results.push({ result: 'error', publicId, error: error.message });
    }
  }
  
  return results;
}

export default cloudinary;
