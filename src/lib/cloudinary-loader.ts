export default function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src && src.includes('res.cloudinary.com')) {
    // Inject Cloudinary optimization parameters
    // Format: https://res.cloudinary.com/cloud_name/image/upload/v12345/path/image.jpg
    // We want to insert w_width,c_limit,q_auto,f_auto
    const params = [`w_${width}`, 'c_limit', `q_${quality || 'auto'}`, 'f_auto'];
    return src.replace('/upload/', `/upload/${params.join(',')}/`);
  }
  return src;
}
