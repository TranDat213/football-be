import cloudinary from '@/config/cloudinary.config';

export enum FolderType {
  AVATARS = 'avatars',
  IMAGES = 'images',
  THUMBNAILS = 'thumbnails',
}

const ROOT_FOLDER = 'website-blog';

export type CloudinaryImage = {
  secureUrl: string;
  publicId: string;
};

export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  originalName: string,
  folderType: FolderType,
): Promise<CloudinaryImage> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${ROOT_FOLDER}/${folderType}`,
        resource_type: 'image',
        public_id: `${Date.now()}-${originalName
          .replace(/\.[^/.]+$/, '') // bỏ extension
          .replace(/[^a-zA-Z0-9_-]/g, '')}`,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result) {
          return reject(new Error('Upload failed'));
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    uploadStream.end(fileBuffer);
  });
};

export const deleteImageFromCloudinary = async (
  publicId: string,
): Promise<void> => {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
  });

  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new Error(`Failed to delete image: ${result.result}`);
  }
};