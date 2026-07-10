"use client";

/**
 * Image Captioning Page (Next.js App Router)
 * -------------------------------------------
 * Uses TensorFlow.js in the browser to caption an uploaded image.
 *
 * IMPORTANT NOTE ON APPROACH:
 * TensorFlow.js does not ship an official, ready-to-use end-to-end
 * "image captioning" model (no equivalent of MobileNet/COCO-SSD for
 * this specific task). Real captioning demos train a custom CNN+LSTM
 * on datasets like Flickr8k/MSCOCO, which requires an offline training
 * pipeline and hosting custom model weights.
 *
 * This page instead uses the officially maintained, pretrained
 * @tensorflow-models/mobilenet classifier (runs fully client-side,
 * loads from a CDN, no training needed) and turns its top predictions
 * into a natural-language caption using lightweight templating.
 * This gives you working, real-time "captioning" in a single page.
 *
 * If you specifically need a true sequence-generation caption model,
 * you'd need to train and convert one with the TF Python API (see
 * tensorflow.org/text/tutorials/image_captioning) and load the
 * converted model here with tf.loadGraphModel() instead of MobileNet.
 *
 * SETUP:
 *   npm install @tensorflow/tfjs @tensorflow-models/mobilenet
 *
 * Drop this file at: app/image-captioning/page.tsx
 */

import { useState, useRef, useCallback } from "react";
import type { MobileNet } from "@tensorflow-models/mobilenet";

type Prediction = {
  className: string;
  probability: number;
};

export default function ImageCaptioningPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loadingModel, setLoadingModel] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const modelRef = useRef<MobileNet | null>(null);

  // Lazily load TF.js + MobileNet only when needed, and cache the model.
  const ensureModelLoaded = useCallback(async () => {
    if (modelRef.current) return modelRef.current;
    setLoadingModel(true);
    setError(null);
    try {
      const tf = await import("@tensorflow/tfjs");
      const mobilenetLib = await import("@tensorflow-models/mobilenet");
      await tf.ready();
      const model = await mobilenetLib.load({ version: 2, alpha: 1.0 });
      modelRef.current = model;
      return model;
    } catch (err) {
      console.error(err);
      setError("Failed to load the model. Check your connection and try again.");
      return null;
    } finally {
      setLoadingModel(false);
    }
  }, []);

  const buildCaption = (preds: Prediction[]): string => {
    if (!preds.length) return "I couldn't identify anything confidently in this image.";

    const clean = (label: string) =>
      label.split(",")[0].trim().replace(/_/g, " ");

    const top = clean(preds[0].className);
    const topConfidence = preds[0].probability;

    if (preds.length === 1 || preds[1].probability < 0.15) {
      return `This looks like a photo of ${withArticle(top)}.`;
    }

    const second = clean(preds[1].className);
    const third = preds[2] ? clean(preds[2].className) : null;

    if (topConfidence > 0.6) {
      return `This appears to be a photo of ${withArticle(top)}${
        third ? `, possibly featuring elements of ${second} or ${third}` : ` and ${second}`
      }.`;
    }

    return `This image likely shows ${withArticle(top)} or ${withArticle(second)}${
      third ? `, with some resemblance to ${third}` : ""
    }.`;
  };

  const withArticle = (noun: string) => {
    const useAn = /^[aeiou]/i.test(noun);
    return `${useAn ? "an" : "a"} ${noun}`;
  };

  const handleFile = async (file: File) => {
    setError(null);
    setCaption("");
    setPredictions([]);

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onImageLoaded = async () => {
    const model = await ensureModelLoaded();
    if (!model || !imgRef.current) return;

    setAnalyzing(true);
    setError(null);
    try {
      const preds = await model.classify(imgRef.current, 5);
      setPredictions(preds);
      setCaption(buildCaption(preds));
    } catch (err) {
      console.error(err);
      setError("Something went wrong while analyzing the image.");
    } finally {
      setAnalyzing(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setImageSrc(null);
    setCaption("");
    setPredictions([]);
    setError(null);
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Image Captioning</h1>
          <p style={styles.subtitle}>
            Runs entirely in your browser with TensorFlow.js — no server, no
            uploads leave your device.
          </p>
        </header>

        {!imageSrc && (
          <div
            style={styles.dropzone}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <p style={styles.dropzoneText}>
              Drag & drop an image here, or click to select one
            </p>
            <input
              id="file-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={onFileInputChange}
            />
          </div>
        )}

        {imageSrc && (
          <div style={styles.resultCard}>
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Uploaded"
              onLoad={onImageLoaded}
              style={styles.image}
              crossOrigin="anonymous"
            />

            <div style={styles.captionBox}>
              {(loadingModel || analyzing) && (
                <p style={styles.statusText}>
                  {loadingModel ? "Loading model…" : "Analyzing image…"}
                </p>
              )}

              {error && <p style={styles.errorText}>{error}</p>}

              {!loadingModel && !analyzing && caption && (
                <>
                  <p style={styles.captionText}>&ldquo;{caption}&rdquo;</p>
                  <div style={styles.tagsRow}>
                    {predictions.map((p, i) => (
                      <span key={i} style={styles.tag}>
                        {p.className.split(",")[0]} ·{" "}
                        {(p.probability * 100).toFixed(1)}%
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button style={styles.button} onClick={reset}>
              Try another image
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b0c10",
    color: "#f5f5f7",
    display: "flex",
    justifyContent: "center",
    padding: "48px 20px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  container: {
    width: "100%",
    maxWidth: 560,
  },
  header: {
    marginBottom: 32,
    textAlign: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    marginTop: 8,
    color: "#9a9ba5",
    fontSize: 15,
    lineHeight: 1.5,
  },
  dropzone: {
    border: "2px dashed #34353f",
    borderRadius: 16,
    padding: "64px 24px",
    textAlign: "center",
    cursor: "pointer",
    background: "#131419",
    transition: "border-color 0.15s ease",
  },
  dropzoneText: {
    color: "#9a9ba5",
    fontSize: 15,
    margin: 0,
  },
  resultCard: {
    background: "#131419",
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid #23242c",
  },
  image: {
    width: "100%",
    maxHeight: 400,
    objectFit: "cover",
    display: "block",
  },
  captionBox: {
    padding: 24,
    minHeight: 60,
  },
  statusText: {
    color: "#9a9ba5",
    fontSize: 14,
    margin: 0,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    margin: 0,
  },
  captionText: {
    fontSize: 18,
    lineHeight: 1.5,
    fontStyle: "italic",
    margin: "0 0 16px 0",
  },
  tagsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    background: "#1f2028",
    border: "1px solid #2c2d37",
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 12,
    color: "#c8c9d1",
  },
  button: {
    display: "block",
    width: "100%",
    padding: "14px 24px",
    background: "#1f2028",
    color: "#f5f5f7",
    border: "none",
    borderTop: "1px solid #23242c",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};