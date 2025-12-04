import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cấu hình Cloudinary
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload ảnh lên Cloudinary
 * @param {string|Buffer} filePathOrBuffer - Đường dẫn file hoặc buffer
 * @param {string} folder - Thư mục lưu trên Cloudinary
 * @returns {Promise<Object>} - Kết quả upload
 */
export async function uploadToCloudinary(filePathOrBuffer, folder = 'attendance') {
  try {
    let uploadSource = filePathOrBuffer;
    
    // Nếu là Buffer, convert sang base64 data URI
    if (Buffer.isBuffer(filePathOrBuffer)) {
      uploadSource = `data:image/jpeg;base64,${filePathOrBuffer.toString('base64')}`;
    }
    
    const result = await cloudinary.uploader.upload(uploadSource, {
      folder: folder,
      resource_type: 'image',
      allowed_formats: ['jpg', 'png', 'jpeg'],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    throw new Error('Failed to upload image to Cloudinary');
  }
}

/**
 * Xóa ảnh từ Cloudinary
 * @param {string} publicId - Public ID của ảnh
 * @returns {Promise<Object>}
 */
export async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error('Failed to delete image from Cloudinary');
  }
}

export default cloudinary;
