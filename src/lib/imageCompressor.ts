/**
 * Image Compression Utility for School Logos & Document Assets
 * Resizes and compresses images via HTML5 Canvas to keep Firestore documents
 * well under the 1MB limit (typically 10KB - 40KB per logo).
 */

export async function compressImage(
  fileOrBase64: File | string,
  maxDimension: number = 256,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's a lightweight SVG string (< 50KB), keep it as is
    if (typeof fileOrBase64 === "string" && fileOrBase64.startsWith("data:image/svg+xml") && fileOrBase64.length < 50000) {
      return resolve(fileOrBase64);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio scale
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(typeof fileOrBase64 === "string" ? fileOrBase64 : "");
        }

        // Smooth rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first, fallback to PNG / JPEG
        let compressed = "";
        try {
          compressed = canvas.toDataURL("image/webp", quality);
        } catch {
          // Fallback to PNG
          compressed = canvas.toDataURL("image/png");
        }

        // If compressed is still larger than PNG, use whichever is smaller
        const pngFallback = canvas.toDataURL("image/png");
        if (pngFallback.length < compressed.length) {
          compressed = pngFallback;
        }

        resolve(compressed);
      } catch (err) {
        console.warn("Image compression warning, using original:", err);
        if (typeof fileOrBase64 === "string") {
          resolve(fileOrBase64);
        } else {
          // If file, convert to basic data URL
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(fileOrBase64);
        }
      }
    };

    img.onerror = (err) => {
      console.warn("Failed to load image for compression:", err);
      if (typeof fileOrBase64 === "string") {
        resolve(fileOrBase64);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrBase64);
      }
    };

    if (typeof fileOrBase64 === "string") {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBase64);
    }
  });
}
