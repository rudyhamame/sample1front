// video-compress.js
// Browser-based video compression and upload retry for Cloudinary
// Requires: ffmpeg.wasm (https://github.com/ffmpegwasm/ffmpeg.wasm)

import { FFmpeg } from "@ffmpeg/ffmpeg";

const ffmpeg = new FFmpeg({ log: true });

export async function compressVideo(file, targetSizeMB = 95) {
  if (!ffmpeg.isLoaded()) await ffmpeg.load();
  const inputName = "input.mp4";
  const outputName = "output.mp4";
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  await ffmpeg.writeFile(inputName, uint8Array);

  // Try to compress to target size (approximate, may need tuning)
  // Example: 1Mbps for ~8min video ≈ 60MB, so use lower bitrate for longer videos
  const duration = await getVideoDuration(file);
  const bitrate = Math.max(300, Math.floor((targetSizeMB * 8192) / duration)); // kbps

  await ffmpeg.exec([
    "-i",
    inputName,
    "-b:v",
    `${bitrate}k`,
    "-vf",
    "scale=1280:-2", // 720p max
    "-preset",
    "veryfast",
    outputName,
  ]);
  const data = await ffmpeg.readFile(outputName);
  return new File([data], "compressed.mp4", { type: "video/mp4" });
}

async function getVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve(video.duration || 60);
    };
    video.src = URL.createObjectURL(file);
  });
}

// Usage in upload logic:
// try {
//   await uploadToCloudinary(file);
// } catch (e) {
//   if (e.status === 413 || e.status === 403) {
//     const compressed = await compressVideo(file);
//     await uploadToCloudinary(compressed);
//   } else throw e;
// }
