export async function apiRequest(path, method = "GET", body, token) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const readBodySafely = async () => {
    if (isJson) {
      return response.json().catch(() => null);
    }
    const text = await response.text().catch(() => "");
    return text ? { message: text } : null;
  };

  if (!response.ok) {
    const error = await readBodySafely();
    throw new Error((error && error.message) || "Request failed");
  }

  if (response.status === 204 || response.status === 205) {
    return null;
  }

  return readBodySafely();
}

export function getFriendlyUploadErrorMessage(response, fallbackMessage = "Upload failed") {
  if (!response) {
    return fallbackMessage;
  }

  if (response.status === 413) {
    return "This image is too large. Please compress it or choose a smaller one (max 5MB).";
  }

  if (response.status === 415) {
    return "Hindi supported ang file type. Image file lang ang puwedeng i-upload.";
  }

  return fallbackMessage;
}

export async function uploadImage(path, file, token) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(path, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });
  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const errorBody = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : { message: await response.text().catch(() => "") };

    throw new Error(
      (errorBody && errorBody.message) ||
      getFriendlyUploadErrorMessage(response, "Upload failed")
    );
  }
  return response.json();
}
