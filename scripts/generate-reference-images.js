// Script to generate reference images for AI aspect ratio detection
const fs = require('fs');
const path = require('path');

// Reference image configurations
const references = [
  // Square - 1:1
  { name: 'square-1-1.png', width: 1080, height: 1080, label: 'Square (1:1)', platforms: ['LinkedIn', 'Instagram', 'Facebook'] },
  
  // Landscape - 16:9
  { name: 'landscape-16-9.png', width: 1920, height: 1080, label: 'Landscape (16:9)', platforms: ['YouTube', 'Twitter', 'Reddit'] },
  
  // Portrait - 9:16
  { name: 'portrait-9-16.png', width: 1080, height: 1920, label: 'Portrait (9:16)', platforms: ['TikTok', 'Instagram Story'] },
  
  // Standard - 4:3
  { name: 'standard-4-3.png', width: 1600, height: 1200, label: 'Standard (4:3)', platforms: ['Facebook', 'Presentations'] },
  
  // Portrait - 3:4
  { name: 'portrait-3-4.png', width: 1200, height: 1600, label: 'Portrait (3:4)', platforms: ['Pinterest'] },
];

// Function to create a simple PNG with specified dimensions
function createPNG(width, height) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk (image header)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);  // bit depth
  ihdrData.writeUInt8(2, 9);  // color type (RGB)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  
  const ihdrChunk = createChunk('IHDR', ihdrData);
  
  // Simple IDAT chunk (image data) - solid color
  const scanlineSize = width * 3 + 1; // RGB + filter byte
  const idatSize = height * scanlineSize;
  const idatData = Buffer.alloc(idatSize);
  
  // Fill with a gradient pattern
  for (let y = 0; y < height; y++) {
    const offset = y * scanlineSize;
    idatData.writeUInt8(0, offset); // filter byte
    
    for (let x = 0; x < width; x++) {
      const pixelOffset = offset + 1 + x * 3;
      // Create a gradient from blue to purple
      idatData.writeUInt8(100 + Math.floor(x / width * 155), pixelOffset);     // R
      idatData.writeUInt8(50 + Math.floor(y / height * 100), pixelOffset + 1); // G
      idatData.writeUInt8(200, pixelOffset + 2);                                // B
    }
  }
  
  // Compress IDAT data (simplified - just use raw data)
  const zlib = require('zlib');
  const compressedData = zlib.deflateSync(idatData);
  const idatChunk = createChunk('IDAT', compressedData);
  
  // IEND chunk (end of image)
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  // Combine all chunks
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  
  const crc = require('zlib').crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// Generate all reference images
const outputDir = path.join(__dirname, '../public/reference-images');

console.log('Generating reference images...\n');

references.forEach(ref => {
  const png = createPNG(ref.width, ref.height);
  const filePath = path.join(outputDir, ref.name);
  
  fs.writeFileSync(filePath, png);
  
  console.log(`✓ Created: ${ref.name}`);
  console.log(`  Size: ${ref.width}x${ref.height}`);
  console.log(`  Label: ${ref.label}`);
  console.log(`  Platforms: ${ref.platforms.join(', ')}`);
  console.log('');
});

// Create a JSON file with reference metadata
const metadata = {
  references: references.map(ref => ({
    file: `/reference-images/${ref.name}`,
    width: ref.width,
    height: ref.height,
    aspectRatio: `${ref.width}:${ref.height}`,
    label: ref.label,
    platforms: ref.platforms
  }))
};

fs.writeFileSync(
  path.join(outputDir, 'metadata.json'),
  JSON.stringify(metadata, null, 2)
);

console.log('✓ Created: metadata.json');
console.log('\nAll reference images generated successfully!');
console.log(`Location: ${outputDir}`);
