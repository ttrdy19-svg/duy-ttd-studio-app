import { expect, it } from "vitest";
import { WebmFile } from "@fix-webm-duration/parser";
import { finalizeWebm } from "./finalizeWebm";

it("bổ sung thời lượng và giữ Cluster mở để các Cluster sau không bị lồng trong parent hữu hạn", async () => {
  // Minimal EBML metadata fixture, not an encoded video. Mirrors Chromium's
  // unknown-length Segment/Clusters; real encoded media is checked in Chromium/ffmpeg.
  const bytes = new Uint8Array([
    0x1a, 0x45, 0xdf, 0xa3, 0x80, 0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0x15, 0x49, 0xa9, 0x66, 0x87, 0x2a, 0xd7,
    0xb1, 0x83, 0x0f, 0x42, 0x40, 0x1f, 0x43, 0xb6, 0x75, 0x01, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xe7, 0x81, 0x00, 0x1f, 0x43, 0xb6, 0x75,
    0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xe7, 0x81, 0x01,
  ]);
  const output = await finalizeWebm(
    new Blob([bytes], { type: "video/webm" }),
    2500,
  );
  const data = await WebmFile.blobToArray(output);
  const file = new WebmFile(data);
  expect(
    file
      .getSectionById(0x8538067)
      ?.getSectionById(0x549a966)
      ?.getSectionById(0x489)
      ?.getValue(),
  ).toBe(2500);
  const clusterAt = data.findIndex(
    (value, i) =>
      value === 0x1f &&
      data[i + 1] === 0x43 &&
      data[i + 2] === 0xb6 &&
      data[i + 3] === 0x75,
  );
  expect(Array.from(data.slice(clusterAt + 4, clusterAt + 12))).toEqual([
    1, 255, 255, 255, 255, 255, 255, 255,
  ]);
});
