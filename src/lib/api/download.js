import { apiClient, toApiError } from "@/lib/api/client";

function filenameFrom(disposition, fallback) {
  const match = /filename="?([^";]+)"?/i.exec(disposition || "");
  return match ? match[1] : fallback;
}

/**
 * Download an authenticated file (invoice, report) and save it. The request
 * carries the access token, so plain links can't be used. Throws an ApiError.
 */
export async function downloadFile(url, fallbackName) {
  let response;
  try {
    response = await apiClient.get(url, { responseType: "blob", timeout: 60_000 });
  } catch (error) {
    // Error bodies arrive as a Blob too; read the JSON error envelope from it.
    const data = error?.response?.data;
    if (data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await data.text());
      } catch {
        // Not JSON: fall back to the generic message.
      }
    }
    throw toApiError(error);
  }

  const name = filenameFrom(response.headers?.["content-disposition"], fallbackName);
  const href = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 0);
  return name;
}
