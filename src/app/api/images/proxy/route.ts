/**
 * Image Proxy API
 * Proxies external images through our server for reliability and caching
 * 
 * GET /api/images/proxy?url=<encoded-url>
 */

import { NextRequest, NextResponse } from "next/server";
import { downloadAndCacheImage, generateImageHash, isImageCached } from "@/lib/image-service";

// Configuration
const MAX_IMAGE_SIZE_MB = 5;
const CACHE_CONTROL_HEADER = "public, max-age=86400, s-maxage=604800"; // 1 day client, 7 days CDN

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Missing 'url' parameter" },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Check if image is already cached locally
    const urlHash = generateImageHash(imageUrl);
    const cachedPath = await isImageCached(urlHash);

    if (cachedPath) {
      // Redirect to cached image
      return NextResponse.redirect(
        new URL(cachedPath, request.nextUrl.origin),
        { status: 302 }
      );
    }

    // Fetch the image and optionally cache it
    const downloadResult = searchParams.get("cache") !== "false"
      ? await downloadAndCacheImage(imageUrl)
      : null;

    // If cached successfully, redirect to the cached version
    if (downloadResult?.success && downloadResult.cachedImage) {
      return NextResponse.redirect(
        new URL(downloadResult.cachedImage.localPath, request.nextUrl.origin),
        { status: 302 }
      );
    }

    // Fall back to proxying directly
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      );
    }

    // Validate content type
    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "URL does not point to an image" },
        { status: 400 }
      );
    }

    // Check content length if available
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Image too large (max ${MAX_IMAGE_SIZE_MB}MB)` },
        { status: 413 }
      );
    }

    // Stream the image response
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": CACHE_CONTROL_HEADER,
        "X-Image-Source": "proxy",
        "X-Original-Url": imageUrl,
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy image" },
      { status: 500 }
    );
  }
}
