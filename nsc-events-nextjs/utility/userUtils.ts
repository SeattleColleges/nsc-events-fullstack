// decode the current user's Id from localStorage
export const getCurrentUserId = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1];
    const decoded = atob(base64);

    const payload = JSON.parse(decoded);

    return payload?.id ?? null;
  } catch (error) {
    console.error("Invalid JWT token:", error);
    return null;
  }
};