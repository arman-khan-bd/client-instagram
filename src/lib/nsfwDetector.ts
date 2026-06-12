import * as tf from "@tensorflow/tfjs";
import * as nsfwjs from "nsfwjs";

let loadedModel: any = null;

// Backward compatible loader helper
export async function loadNSFWJSLibraries(): Promise<{ tf: any; nsfwjs: any }> {
  return { tf, nsfwjs };
}

// Pre-load and warm up the NSFWJS model
export async function getOrLoadNSFWModel(): Promise<any> {
  if (loadedModel) return loadedModel;

  try {
    tf.enableProdMode();
  } catch (e) {
    console.warn("Failed to enable tfjs prod mode", e);
  }

  // Load the model.
  loadedModel = await nsfwjs.load();
  return loadedModel;
}

export interface ScanResult {
  isAdult: boolean;
  probability: number;
  category: string;
  predictions: { className: string; probability: number }[];
}

// Scan an image or video file for NSFW content
export async function scanFileForAdultContent(file: File): Promise<ScanResult> {
  const model = await getOrLoadNSFWModel();
  const fileType = file.type;

  let elementToClassify: HTMLImageElement | HTMLCanvasElement;
  let objectUrlToRevoke: string | null = null;

  try {
    if (fileType.startsWith("image/")) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      objectUrlToRevoke = objectUrl;
      img.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image file for scanning"));
      });
      elementToClassify = img;
    } else if (fileType.startsWith("video/")) {
      const video = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);
      objectUrlToRevoke = objectUrl;
      video.src = objectUrl;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => resolve(); // continue and let it fail on seek or render
      });

      // Seek to 1 second, or 30% of the video duration if it's shorter, to avoid leading black frames
      const seekTime = Math.min(1.0, video.duration * 0.3 || 0);
      video.currentTime = seekTime;

      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      elementToClassify = canvas;
    } else {
      throw new Error("Unsupported file type for safety scan");
    }

    // Classify the element (image or canvas)
    const predictions: { className: string; probability: number }[] = await model.classify(elementToClassify);
    console.log("NSFW safety scan results for:", file.name, predictions);

    // Sum probabilities for Porn, Sexy, and Hentai
    let adultProbability = 0;
    let highestAdultCategory = "";
    let maxAdultProb = 0;

    predictions.forEach((pred) => {
      const categoryLower = pred.className.toLowerCase();
      if (["porn", "sexy", "hentai"].includes(categoryLower)) {
        adultProbability += pred.probability;
        if (pred.probability > maxAdultProb) {
          maxAdultProb = pred.probability;
          highestAdultCategory = pred.className;
        }
      }
    });

    // Clean up
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }

    return {
      isAdult: adultProbability >= 0.50,
      probability: adultProbability,
      category: highestAdultCategory || "Safe",
      predictions
    };
  } catch (error) {
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }
    console.error("Error running NSFW safety scan:", error);
    // If scanning fails (e.g. invalid file format), we default to allowing it to not block users unnecessarily
    return {
      isAdult: false,
      probability: 0,
      category: "Unknown",
      predictions: []
    };
  }
}
