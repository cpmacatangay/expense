import sharp from "sharp";

const standard = "public/brand/salo-icon-source.svg";
const maskable = "public/brand/salo-icon-maskable-source.svg";

const jobs = [
  { input: standard, output: "public/icons/salo-192.png", size: 192 },
  { input: standard, output: "public/icons/salo-512.png", size: 512 },
  { input: standard, output: "public/icons/apple-touch-icon.png", size: 180 },
  { input: maskable, output: "public/icons/salo-maskable-512.png", size: 512 }
];

for (const job of jobs) {
  await sharp(job.input, { density: 384 })
    .resize(job.size, job.size)
    .png()
    .toFile(job.output);
  console.log(`${job.output} ${job.size}x${job.size}`);
}
