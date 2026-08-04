import imageCompression from 'browser-image-compression';

const compressImageFile = async (file, options = {}) => {
  if (!file || !file.type?.startsWith('image/')) {
    return file;
  }

  const compressionOptions = {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 2400,
    useWebWorker: true,
    initialQuality: 0.75,
    ...options,
  };

  try {
    const compressedBlob = await imageCompression(file, compressionOptions);
    if (!compressedBlob || compressedBlob.size >= file.size) {
      return file;
    }
    return new File([compressedBlob], file.name, { type: compressedBlob.type || file.type });
  } catch (error) {
    console.warn('Admin image compression failed:', error);
    return file;
  }
};

export default compressImageFile;
