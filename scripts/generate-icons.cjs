const sharp = require("sharp");
const fs = require("fs");
fs.mkdirSync("public/icons", { recursive: true });
const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#173f33"/><rect x="120" y="120" width="272" height="272" rx="68" fill="#d4eaa9"/><path d="M180 195h50l26 18 26-18h50v128h-50l-26 18-26-18h-50z M256 213v128" fill="none" stroke="#173f33" stroke-width="15" stroke-linejoin="round"/></svg>`,
);
Promise.all(
  [
    [192, "icon-192"],
    [512, "icon-512"],
    [512, "maskable-512"],
    [180, "apple-touch-icon"],
  ].map(([size, name]) =>
    sharp(svg)
      .resize(size, size)
      .png()
      .toFile("public/icons/" + name + ".png"),
  ),
).then(() => console.log("Icons generated"));
