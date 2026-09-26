/**
 * jsdom setup for the component half of the suite (madash#33).
 */
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// React Testing Library does not auto-clean when `globals` is on in some
// vitest versions; unmounting between cases keeps provider effects from one
// test leaking into the next.
afterEach(() => {
    cleanup();
});
