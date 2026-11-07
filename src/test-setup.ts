import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
afterEach(cleanup);

// jsdom has no canvas renderer; real drawing/encoding is checked in Chromium.
import { vi } from "vitest";
vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
