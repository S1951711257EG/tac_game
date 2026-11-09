/**
 * Generates all original visual assets for Iron Meridian.
 *
 * Every asset is AI-generated for this project (no third-party references),
 * then resized/compressed with sharp. Output: public/assets/img/*.jpg
 * Run: bun run scripts/gen-assets.mjs [--only name1,name2]
 */
import ZAI from "z-ai-web-dev-sdk";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const OUT = path.resolve("public/assets/img");
fs.mkdirSync(OUT, { recursive: true });

const STYLE =
  "original game asset, painterly military strategy-game art, muted desaturated palette, overcast dramatic lighting, gritty diesel-punk alternate-history aesthetic, high quality, detailed, no text, no watermark, no logo, no border";

const TILE_STYLE =
  "seamless tileable top-down game terrain texture, orthographic aerial view, uniform even lighting, painterly detail, edges designed to tile, no shadows, no text";

const ICON_STYLE =
  "centered game unit icon on plain flat dark charcoal background (#1a2027), clean readable silhouette, subtle rim light, slight three-quarter top-down view, single subject, no text";

const ASSETS = [
  {
    name: "menu-hero",
    size: "1344x768",
    width: 1344,
    prompt: `Vast battlefield panorama at dusk: long columns of teal-flagged Federation troops and tanks advancing across muddy plains toward a distant river line, crimson-flared enemy positions on the horizon, smoke and searchlights, ${STYLE}`,
  },
  {
    name: "campaign-map",
    size: "1344x768",
    width: 1344,
    prompt: `Old strategic campaign map of a fictional continent, painted parchment and cloth texture, hand-drawn rivers mountains forests and small city icons, teal and crimson army markers with arrows, brass compass rose, wargame war-room aesthetic, ${STYLE}`,
  },
  {
    name: "emblem-astria",
    size: "1024x1024",
    width: 256,
    prompt: `Military faction emblem: polished steel shield with a teal four-point compass star and chevron motif, minimal geometric insignia design, flat painterly rendering on dark charcoal background, ${STYLE}`,
  },
  {
    name: "emblem-karsia",
    size: "1024x1024",
    width: 256,
    prompt: `Military faction emblem: dark iron roundel with a crimson eight-rayed sunburst over a cog-wheel motif, minimal geometric insignia design, flat painterly rendering on dark charcoal background, ${STYLE}`,
  },
  {
    name: "terrain-plains",
    size: "1024x1024",
    width: 192,
    prompt: `Open grassy plains, short dry steppe grass in muted olive tones, ${TILE_STYLE}, ${STYLE}`,
  },
  {
    name: "terrain-forest",
    size: "1024x1024",
    width: 192,
    prompt: `Dense coniferous forest canopy seen from directly above, deep muted greens, ${TILE_STYLE}, ${STYLE}`,
  },
  {
    name: "terrain-hills",
    size: "1024x1024",
    width: 192,
    prompt: `Rolling grassy highlands with gentle contours and small rocky outcrops, top-down aerial view, light warm khaki and moss-green tones, bright daylight, ${TILE_STYLE}, ${STYLE}`,
  },
  {
    name: "terrain-mountains",
    size: "1024x1024",
    width: 192,
    prompt: `Rugged rocky mountain ridges with scree and snow dusting, top-down aerial view, cold grey tones, ${TILE_STYLE}, ${STYLE}`,
  },
  {
    name: "terrain-city",
    size: "1024x1024",
    width: 192,
    prompt: `Small old-European town seen from directly above, dense tiled rooftops in muted browns and greys, narrow streets, a market square, ${TILE_STYLE}, ${STYLE}`,
  },
  {
    name: "terrain-bridge",
    size: "1024x1024",
    width: 192,
    prompt: ` sturdy stone-and-timber bridge crossing a dark river, top-down aerial view, weathered planks and masonry, ${TILE_STYLE}, ${STYLE}`,
  },
  {
    name: "terrain-water",
    size: "1024x1024",
    width: 192,
    prompt: `Calm river water in daylight, clearly visible steel-blue and teal tones with soft light ripples and gentle reflections, top-down view, medium brightness, ${TILE_STYLE}, ${STYLE}`,
  },
  {
    name: "unit-infantry",
    size: "1024x1024",
    width: 256,
    prompt: `Small squad of three WWII-era style riflemen in teal-grey greatcoats standing in formation with bolt-action rifles and helmets, ${ICON_STYLE}, ${STYLE}`,
  },
  {
    name: "unit-recon",
    size: "1024x1024",
    width: 256,
    prompt: `Light armored scout car, small open-top wheeled vehicle with antenna and mounted machine gun, teal-grey paint, ${ICON_STYLE}, ${STYLE}`,
  },
  {
    name: "unit-armor",
    size: "1024x1024",
    width: 256,
    prompt: `Heavily armored main battle tank with long gun barrel and sloped hull, teal-grey camouflage paint, ${ICON_STYLE}, ${STYLE}`,
  },
  {
    name: "unit-artillery",
    size: "1024x1024",
    width: 256,
    prompt: `Towed field artillery howitzer with long barrel on split carriage trail, two gunners in teal-grey uniforms serving the gun, ${ICON_STYLE}, ${STYLE}`,
  },
];

const only = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1].split(",")
  : null;

async function generate(zai, asset) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await zai.images.generations.create({ prompt: asset.prompt, size: asset.size });
      const b64 = res?.data?.[0]?.base64;
      if (!b64) throw new Error("empty response");
      const outPath = path.join(OUT, `${asset.name}.jpg`);
      await sharp(Buffer.from(b64, "base64"))
        .resize({ width: asset.width, withoutEnlargement: true })
        .jpeg({ quality: 84 })
        .toFile(outPath);
      const kb = Math.round(fs.statSync(outPath).size / 1024);
      console.log(`OK ${asset.name}.jpg (${kb} KB)`);
      return true;
    } catch (err) {
      console.error(`attempt ${attempt} failed for ${asset.name}: ${err.message}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1200 * attempt));
    }
  }
  return false;
}

const zai = await ZAI.create();
let failed = [];
for (const asset of ASSETS) {
  if (only && !only.includes(asset.name)) continue;
  const ok = await generate(zai, asset);
  if (!ok) failed.push(asset.name);
}
if (failed.length) {
  console.error(`FAILED: ${failed.join(", ")}`);
  process.exit(1);
}
console.log("All assets generated.");
