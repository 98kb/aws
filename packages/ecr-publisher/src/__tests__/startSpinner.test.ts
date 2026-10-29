import {describe, it, expect, vi, beforeEach} from "vitest";
import ora from "ora";
import {startSpinner} from "../startSpinner";

const spinner = {start: vi.fn().mockReturnThis(), stop: vi.fn()};

vi.mock("ora", () => ({default: vi.fn(() => spinner)}));

describe("startSpinner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disables ora animation when not interactive", () => {
    startSpinner("Checking...", false);
    expect(vi.mocked(ora)).toHaveBeenCalledWith({
      text: "Checking...",
      isEnabled: false,
    });
  });

  it("leaves isEnabled unset when interactive", () => {
    startSpinner("Checking...", true);
    const options = vi.mocked(ora).mock.calls[0][0];
    expect(options).toEqual({text: "Checking..."});
  });

  it("returns the started spinner", () => {
    expect(startSpinner("Checking...", true)).toBe(spinner);
    expect(spinner.start).toHaveBeenCalledOnce();
  });
});
