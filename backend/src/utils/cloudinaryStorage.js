/**
 * Custom Cloudinary Storage Engine for Multer
 * Tương thích với Cloudinary v2.x
 * 
 * Lưu ý: cloudinary instance phải được truyền vào options và đã được config
 */
export class CloudinaryStorage {
    constructor(options) {
        // Bắt buộc phải truyền cloudinary instance đã được config
        if (!options || !options.cloudinary) {
            throw new Error('CloudinaryStorage requires a configured cloudinary instance');
        }
        this.cloudinary = options.cloudinary;
        this.params = options.params || {};
    }

    _handleFile(req, file, cb) {
        // Tạo stream để đọc file
        const chunks = [];

        file.stream.on('data', (chunk) => {
            chunks.push(chunk);
        });

        file.stream.on('end', async () => {
            try {
                const buffer = Buffer.concat(chunks);

                // Convert buffer sang base64 data URI
                const base64Data = buffer.toString('base64');
                const dataUri = `data:${file.mimetype};base64,${base64Data}`;

                // Upload lên Cloudinary
                const uploadOptions = {
                    folder: this.params.folder || 'attendance',
                    allowed_formats: this.params.allowed_formats || ['jpg', 'jpeg', 'png', 'gif', 'webp'],
                    resource_type: 'image',
                };

                // Thêm transformation nếu có
                if (this.params.transformation && this.params.transformation.length > 0) {
                    uploadOptions.transformation = this.params.transformation;
                }

                const result = await this.cloudinary.uploader.upload(dataUri, uploadOptions);

                // Trả về thông tin file đã upload
                cb(null, {
                    fieldname: file.fieldname,
                    originalname: file.originalname,
                    encoding: file.encoding,
                    mimetype: file.mimetype,
                    size: buffer.length,
                    bucket: 'cloudinary',
                    key: result.public_id,
                    acl: 'public-read',
                    contentType: file.mimetype,
                    metadata: {
                        public_id: result.public_id,
                        url: result.secure_url,
                        width: result.width,
                        height: result.height,
                        format: result.format,
                    },
                    location: result.secure_url,
                    etag: result.etag,
                });
            } catch (error) {
                cb(error);
            }
        });

        file.stream.on('error', (error) => {
            cb(error);
        });
    }

    _removeFile(req, file, cb) {
        // Xóa file từ Cloudinary nếu có public_id
        if (file.metadata && file.metadata.public_id) {
            this.cloudinary.uploader
                .destroy(file.metadata.public_id)
                .then(() => cb(null))
                .catch((error) => cb(error));
        } else {
            cb(null);
        }
    }
}

