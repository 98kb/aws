import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {EventEmitter} from "node:events";
import prompts from "prompts";
import type {Context} from "../Context";
import type {PublisherSettings} from "../PublisherSettings";
import {normalizePublisherSettings} from "../normalizePublisherSettings";
import {confirmStep} from "../confirmStep";
import {
  ConfirmationRequiredError,
  PublishCancelledError,
  isEcrPublisherError,
} from "../errors";

vi.mock("prompts", () => ({default: vi.fn()}));

const mockedPrompts = vi.mocked(prompts);

function makeContext(settings: PublisherSettings): Context {
  return {settings: normalizePublisherSettings(settings)} as Context;
}

function stubStdin(isTTY: boolean) {
  const stdin = Object.assign(new EventEmitter(), {isTTY});
  vi.spyOn(process, "stdin", "get").mockReturnValue(stdin as never);
  return stdin;
}

describe("confirmStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubStdin(true);
  });
  afterEach(() => vi.restoreAllMocks());

  describe("with a confirm callback", () => {
    it("proceeds when the callback returns true", async () => {
      const confirm = vi.fn().mockResolvedValue(true);
      await expect(
        confirmStep(makeContext({confirm}), "build", "Build?"),
      ).resolves.toBeUndefined();
    });

    it("proceeds when the callback returns undefined", async () => {
      const confirm = vi.fn().mockReturnValue(undefined);
      await expect(
        confirmStep(makeContext({confirm}), "push", "Push?"),
      ).resolves.toBeUndefined();
    });

    it("passes the plain message and the step to the callback", async () => {
      const confirm = vi.fn().mockResolvedValue(true);
      await confirmStep(
        makeContext({confirm}),
        "create-repo",
        "Create repo?",
        "\u001b[90mCreate repo?\u001b[39m",
      );
      expect(confirm).toHaveBeenCalledWith("Create repo?", {
        step: "create-repo",
      });
    });

    it("throws PublishCancelledError when the callback returns false", async () => {
      const confirm = vi.fn().mockResolvedValue(false);
      const result = confirmStep(makeContext({confirm}), "build", "Build?");
      await expect(result).rejects.toBeInstanceOf(PublishCancelledError);
      await expect(result).rejects.toMatchObject({code: "CANCELLED"});
    });

    it("propagates an error thrown by the callback unchanged", async () => {
      const custom = new Error("caller aborted");
      const confirm = vi.fn().mockRejectedValue(custom);
      await expect(
        confirmStep(makeContext({confirm}), "build", "Build?"),
      ).rejects.toBe(custom);
    });

    it("uses the callback even when yes is true and interactive is false", async () => {
      const confirm = vi.fn().mockResolvedValue(false);
      await expect(
        confirmStep(
          makeContext({confirm, yes: true, interactive: false}),
          "push",
          "Push?",
        ),
      ).rejects.toBeInstanceOf(PublishCancelledError);
      expect(confirm).toHaveBeenCalledOnce();
    });
  });

  describe("with yes and no callback", () => {
    it.each(["build", "push"] as const)(
      "auto-approves %s without prompting",
      async step => {
        await expect(
          confirmStep(
            makeContext({yes: true, interactive: false}),
            step,
            "OK?",
          ),
        ).resolves.toBeUndefined();
        expect(mockedPrompts).not.toHaveBeenCalled();
      },
    );

    it("does not auto-approve create-repo; falls through to the prompt", async () => {
      mockedPrompts.mockResolvedValue({confirm: true});
      await confirmStep(makeContext({yes: true}), "create-repo", "Create?");
      expect(mockedPrompts).toHaveBeenCalledOnce();
    });

    it("rejects create-repo with ConfirmationRequiredError when headless", async () => {
      await expect(
        confirmStep(
          makeContext({yes: true, interactive: false}),
          "create-repo",
          "Create?",
        ),
      ).rejects.toBeInstanceOf(ConfirmationRequiredError);
    });
  });

  describe("without callback or yes", () => {
    it("throws ConfirmationRequiredError when interactive is false", async () => {
      const result = confirmStep(
        makeContext({interactive: false}),
        "build",
        "Build?",
      );
      await expect(result).rejects.toBeInstanceOf(ConfirmationRequiredError);
      await expect(result).rejects.toMatchObject({
        code: "CONFIRMATION_REQUIRED",
      });
      expect(mockedPrompts).not.toHaveBeenCalled();
    });

    it("throws ConfirmationRequiredError without prompting when stdin is not a TTY", async () => {
      stubStdin(false);
      await expect(
        confirmStep(makeContext({}), "build", "Build?"),
      ).rejects.toBeInstanceOf(ConfirmationRequiredError);
      expect(mockedPrompts).not.toHaveBeenCalled();
    });

    it("throws ConfirmationRequiredError without prompting when a TTY stdin has already ended", async () => {
      Object.assign(stubStdin(true), {readableEnded: true, destroyed: true});
      await expect(
        confirmStep(makeContext({}), "build", "Build?"),
      ).rejects.toBeInstanceOf(ConfirmationRequiredError);
      expect(mockedPrompts).not.toHaveBeenCalled();
    });

    it("proceeds when the built-in prompt answers true", async () => {
      mockedPrompts.mockResolvedValue({confirm: true});
      await expect(
        confirmStep(makeContext({}), "build", "Build?"),
      ).resolves.toBeUndefined();
    });

    it("shows the styled prompt message in the built-in prompt", async () => {
      mockedPrompts.mockResolvedValue({confirm: true});
      await confirmStep(makeContext({}), "create-repo", "Create?", "STYLED");
      expect(mockedPrompts.mock.calls[0][0]).toMatchObject({
        type: "confirm",
        message: "STYLED",
        initial: true,
      });
    });

    it("throws PublishCancelledError when the built-in prompt answers false", async () => {
      mockedPrompts.mockResolvedValue({confirm: false});
      await expect(
        confirmStep(makeContext({}), "push", "Push?"),
      ).rejects.toBeInstanceOf(PublishCancelledError);
    });

    it("throws PublishCancelledError when the built-in prompt is cancelled", async () => {
      mockedPrompts.mockImplementation((_question, options) => {
        options?.onCancel?.({} as never, {});
        return Promise.resolve({});
      });
      await expect(
        confirmStep(makeContext({}), "push", "Push?"),
      ).rejects.toBeInstanceOf(PublishCancelledError);
    });

    it.each(["end", "close"])(
      "throws ConfirmationRequiredError when stdin emits %s before an answer",
      async event => {
        const stdin = stubStdin(true);
        mockedPrompts.mockReturnValue(new Promise(vi.fn()));
        const result = confirmStep(makeContext({}), "build", "Build?");
        stdin.emit(event);
        await expect(result).rejects.toBeInstanceOf(ConfirmationRequiredError);
      },
    );

    it("stops listening to stdin once the prompt answers", async () => {
      const stdin = stubStdin(true);
      mockedPrompts.mockResolvedValue({confirm: true});
      await confirmStep(makeContext({}), "build", "Build?");
      expect(stdin.listenerCount("end")).toBe(0);
      expect(stdin.listenerCount("close")).toBe(0);
    });
  });

  it("errors raised are recognised by isEcrPublisherError", async () => {
    const error = await confirmStep(
      makeContext({interactive: false}),
      "build",
      "Build?",
    ).catch((caught: unknown) => caught);
    expect(isEcrPublisherError(error, "CONFIRMATION_REQUIRED")).toBe(true);
  });
});
