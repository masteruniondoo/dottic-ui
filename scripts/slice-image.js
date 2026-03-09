const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function sliceImage({
  inputPath,
  outputDir,
  imageId,
  gridSize = 10,
  format = "webp",
  quality = 90,
}) {
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  const width = metadata.width;
  const height = metadata.height;

  if (!width || !height) {
    throw new Error("Could not read image dimensions.");
  }

  const tileWidth = Math.floor(width / gridSize);
  const tileHeight = Math.floor(height / gridSize);

  const finalOutputDir = path.join(outputDir, imageId);
  fs.mkdirSync(finalOutputDir, { recursive: true });

  const manifest = {
    imageId,
    inputPath,
    width,
    height,
    gridSize,
    tileWidth,
    tileHeight,
    totalTiles: gridSize * gridSize,
    format,
    tiles: [],
  };

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const tileId = row * gridSize + col;

      const left = col * tileWidth;
      const top = row * tileHeight;

      const extractWidth =
        col === gridSize - 1 ? width - left : tileWidth;

      const extractHeight =
        row === gridSize - 1 ? height - top : tileHeight;

      const filename = `tile-${tileId}.${format}`;
      const outputPath = path.join(finalOutputDir, filename);

      let pipeline = sharp(inputPath).extract({
        left,
        top,
        width: extractWidth,
        height: extractHeight,
      });

      if (format === "webp") {
        pipeline = pipeline.webp({ quality });
      } else if (format === "png") {
        pipeline = pipeline.png();
      } else if (format === "jpeg" || format === "jpg") {
        pipeline = pipeline.jpeg({ quality });
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      await pipeline.toFile(outputPath);

      manifest.tiles.push({
        tileId,
        row,
        col,
        filename,
        left,
        top,
        width: extractWidth,
        height: extractHeight,
      });
    }
  }

  fs.writeFileSync(
    path.join(finalOutputDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`Done. Created ${manifest.totalTiles} tiles in ${finalOutputDir}`);
}

async function main() {
  const imageId = process.argv[2] || "camel";
  const inputPath = process.argv[3] || "assets/originals/camel.png";

  await sliceImage({
    inputPath,
    outputDir: "private/tiles",
    imageId,
    gridSize: 10,
    format: "webp",
    quality: 90,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});