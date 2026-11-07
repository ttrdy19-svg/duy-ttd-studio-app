import { fixParsedWebmDuration } from "@fix-webm-duration/fix";
import { WebmContainer, WebmFile } from "@fix-webm-duration/parser";

/** Add duration without turning Chromium's open-ended Clusters into finite parents. */
export async function finalizeWebm(
  blob: Blob,
  milliseconds: number,
): Promise<Blob> {
  const file = await WebmFile.fromBlob(blob);
  const segment = file.getSectionById(0x8538067);
  if (!segment || !fixParsedWebmDuration(file, milliseconds, { logger: false }))
    return blob;
  for (const section of segment.data ?? []) {
    // The parser treats Cluster payload as opaque. It may contain further open-ended
    // Clusters; a finite wrapper would cause a demuxer to reject that structure.
    if (Number(section.id) === 0xf43b675) {
      const cluster = new WebmContainer("Cluster", true);
      cluster.source = section.data.source;
      section.data = cluster;
    }
  }
  segment.updateByData();
  file.updateByData();
  return file.toBlob(blob.type);
}
