import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ResumeUpload, validateResumeFile } from "@/features/resumes/resume-upload";
import { ApiError, apiClient } from "@/lib/api/client";
import { renderRoute } from "@/test/render";

function file(name, size = 2048) {
  return new File([new Uint8Array(size)], name);
}

describe("validateResumeFile", () => {
  it("accepts PDF and DOCX files within the size limit", () => {
    expect(validateResumeFile(file("cv.pdf"))).toBeNull();
    expect(validateResumeFile(file("CV.DOCX"))).toBeNull();
  });

  it("rejects other types, empty files and large files", () => {
    expect(validateResumeFile(file("cv.txt"))).toBe("Upload a PDF or DOCX file.");
    expect(validateResumeFile(file("cv.pdf", 0))).toBe("This file is empty.");
    expect(validateResumeFile(file("cv.pdf", 6 * 1024 * 1024))).toMatch(/5\.0 MB or smaller/);
  });
});

describe("ResumeUpload", () => {
  it("blocks unsupported files before uploading", async () => {
    const post = vi.spyOn(apiClient, "post");
    const user = userEvent.setup({ applyAccept: false });
    renderRoute(<ResumeUpload />);

    await user.upload(screen.getByLabelText("Resume file"), file("notes.txt"));

    expect(screen.getByText("Upload a PDF or DOCX file.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload resume" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Upload resume" }));
    expect(post).not.toHaveBeenCalled();
  });

  it("uploads with progress and reports what was extracted", async () => {
    const post = vi.spyOn(apiClient, "post").mockImplementation(async (url, body, config) => {
      config.onUploadProgress({ loaded: 50, total: 100 });
      return { data: { id: 1, original_filename: "cv.pdf", text_length: 1234 } };
    });
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    renderRoute(<ResumeUpload onUploaded={onUploaded} />);

    await user.upload(screen.getByLabelText("Resume file"), file("cv.pdf"));
    await user.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByText(/Uploaded cv.pdf/)).toHaveTextContent("1,234 characters");
    const [url, body] = post.mock.calls[0];
    expect(url).toBe("/resumes/");
    expect(body.get("file").name).toBe("cv.pdf");
    expect(onUploaded).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("shows extraction errors from the server on the file field", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValue(
      new ApiError({
        status: 400,
        code: "validation_error",
        message: "Some fields are invalid.",
        details: {
          file: ["We couldn't find any text in this PDF. It may be a scanned image."],
        },
      }),
    );
    const user = userEvent.setup();
    renderRoute(<ResumeUpload />);

    await user.upload(screen.getByLabelText("Resume file"), file("scan.pdf"));
    await user.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByText(/It may be a scanned image/)).toBeInTheDocument();
    expect(screen.getByLabelText("Resume file")).toHaveAttribute("aria-invalid", "true");
  });
});
