import { NextResponse } from 'next/server';
import { imageMeta } from 'image-meta';
import { HfInference } from '@huggingface/inference';
import { supabase } from '../../../lib/supabase';

// Parse pool of Hugging Face tokens
const tokenPool = process.env.HF_TOKENS
  ? process.env.HF_TOKENS.split(',').map(t => t.trim()).filter(Boolean)
  : [];

const fallbackToken = process.env.HUGGINGFACE_API_KEY || '';
if (fallbackToken && !tokenPool.includes(fallbackToken)) {
  tokenPool.push(fallbackToken);
}

// Simple helper to pick a token at random to distribute load
function getClient(): HfInference {
  if (tokenPool.length === 0) {
    return new HfInference(fallbackToken);
  }
  const randomToken = tokenPool[Math.floor(Math.random() * tokenPool.length)];
  return new HfInference(randomToken);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Core Metadata
    let meta: any = {};
    try {
      meta = imageMeta(buffer);
    } catch (e) {
      console.warn("Failed to extract image dimensions:", e);
    }

    const imageBlob = new Blob([arrayBuffer], { type: file.type });

    // Dynamic extraction client dynamically chosen from the key pool
    const hf = getClient();

    // 2. AI Image Description (Using Microsoft's advanced vision model)
    let description = "No description available";
    try {
      const captionResult = await hf.imageToText({
        data: imageBlob,
        model: 'microsoft/git-base',
      });
      description = captionResult.generated_text || "No description available";
    } catch (e) {
      console.error("HF Image description error:", e);
    }

    // 3. Object & Tag Detection (facebook/detr-resnet-50)
    let peopleCount = 0;
    let styleTags = ['general'];
    try {
      const detectionResult = await hf.objectDetection({
        data: imageBlob,
        model: 'facebook/detr-resnet-50',
      });
      const people = detectionResult.filter(obj => obj.label === 'person');
      peopleCount = people.length;
      const tags = Array.from(new Set(detectionResult.map(obj => obj.label)));
      if (tags.length > 0) {
        styleTags = tags;
      }
    } catch (e) {
      console.error("HF Object detection error:", e);
    }

    // 4. Text Extraction / OCR (Using Baidu's optimized English text recognition model)
    let extractedText = "";
    try {
      const ocrResult = await hf.imageToText({
        data: imageBlob,
        model: 'Baidu/paddleocr-v2-en',
      });
      extractedText = ocrResult.generated_text || "";
    } catch (ocrErr) {
      console.error("HF OCR error:", ocrErr);
      extractedText = "";
    }

    // Upload image to Cloudinary so we can display/search it later
    let mediaUrl = "";
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", imageBlob, file.name || "analysis.jpg");
      uploadForm.append("upload_preset", "auragram");
      const cloudinaryRes = await fetch("https://api.cloudinary.com/v1_1/dj7pg5slk/image/upload", {
        method: "POST",
        body: uploadForm
      });
      if (cloudinaryRes.ok) {
        const cloudinaryData = await cloudinaryRes.json();
        mediaUrl = cloudinaryData.secure_url || "";
      } else {
        console.warn("Cloudinary upload failed on analysis:", await cloudinaryRes.text());
      }
    } catch (uploadErr) {
      console.error("Failed to upload analyzed image to Cloudinary:", uploadErr);
    }

    // Extract authorization details to find current user
    const authHeader = request.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    let userId: string | null = null;
    if (token) {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          userId = user.id;
        }
      } catch (authErr) {
        console.warn("Failed to get authenticated user:", authErr);
      }
    }

    // Store image analysis data in database
    const imageType = file.type.split('/')[1] || 'unknown';
    try {
      await supabase
        .from('ImageAnalysis')
        .insert({
          userId,
          mediaUrl,
          imageType,
          description,
          peopleCount,
          styleTags,
          textFound: extractedText
        });
    } catch (dbErr) {
      console.error("Database save error for ImageAnalysis:", dbErr);
    }

    return NextResponse.json({
      // Backward compatibility keys
      type: meta.type || file.type || 'unknown',
      dimensions: meta.width && meta.height ? `${meta.width}x${meta.height}` : 'unknown',
      description,
      peopleCount,
      styleTags,
      text: extractedText || "No text found in photo.",

      // New requested keys
      imageType,
      textFound: extractedText,
      mediaUrl
    });

  } catch (error: any) {
    console.error("Analyze API error:", error);
    return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
  }
}
