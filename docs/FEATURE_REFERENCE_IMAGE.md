# Reference Image for AI Image Generation

## Overview
Added the ability to upload a reference image when generating AI images for blog posts. The system automatically detects the dimensions of the reference image and generates the new image with a matching aspect ratio.

## How It Works

### User Flow
1. Click the AI Generator button when creating a post
2. Select the "Image" tab
3. Upload a reference image (optional)
4. Enter your image generation prompt
5. Click "Generate Image"

### Technical Implementation

#### Frontend (`AIGenerator.tsx`)
- Added reference image upload UI with preview
- Converts reference image to base64 before sending to API
- Displays reference image with remove option

#### Backend (`generate-image/route.ts`)
- Accepts `referenceImageBase64` parameter
- Extracts dimensions from PNG and JPEG images
- Calculates closest matching aspect ratio from:
  - 1:1 (Square)
  - 16:9 (Landscape)
  - 9:16 (Portrait)
  - 4:3 (Standard landscape)
  - 3:4 (Standard portrait)
- Uses calculated aspect ratio for image generation

### Supported Image Formats
- PNG
- JPEG/JPG

### Aspect Ratio Matching
The system uses a tolerance-based matching algorithm:
- Calculates width/height ratio
- Matches to closest standard aspect ratio
- Falls back to sensible defaults if no close match

## Benefits
- Ensures generated images match your desired dimensions
- Maintains consistency across blog posts
- Simplifies the image generation process
- No need to manually specify aspect ratios
