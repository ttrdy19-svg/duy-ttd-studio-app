// Optional local artwork: Vite includes matching images in dev and production.
// An empty glob is intentional so the app can build before the owner adds the files.
const artwork = import.meta.glob<string>("./assets/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

function findArtwork(name: string): string | undefined {
  for (const extension of ["jpg", "jpeg", "png", "webp"]) {
    const image = artwork[`./assets/${name}.${extension}`];
    if (image) return image;
  }
}

export const manorBackground = findArtwork("manor-background");
export const minhNhiPortrait = findArtwork("minh-nhi");
