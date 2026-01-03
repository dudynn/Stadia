import { getGuestUserId } from "./auth.js";

export async function fetchMyFavorites() {
  const userId = getGuestUserId();
  if (!userId) return [];

  const res = await fetch(`/api/users/${userId}/favorites`);
  if (!res.ok) throw new Error("failed to fetch favorites");
  return res.json();
}

export async function fetchDiaries({ sport, visibility }) {
  const qs = new URLSearchParams();
  if (sport) qs.set("sport", sport);
  if (visibility) qs.set("visibility", visibility);

  const res = await fetch(`/api/diaries?${qs.toString()}`);
  if (!res.ok) throw new Error("failed to fetch diaries");
  return res.json();
}

export async function fetchMyDiaries({ sport, visibility }) {
  const userId = getGuestUserId();
  if (!userId) return [];

  const qs = new URLSearchParams({ userId, sport });
  if (visibility) qs.set("visibility", visibility);

  const res = await fetch(`/api/diaries?${qs.toString()}`);
  if (!res.ok) throw new Error("failed to fetch diaries");
  return res.json();
}

export async function createDiary(payload) {
  const userId = getGuestUserId();
  if (!userId) throw new Error("no user");

  const res = await fetch("/api/diaries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      user_id: userId,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "failed to create diary");
  }
  return res.json();
}

export async function saveFavorite({ sport, gender, team_code }) {
  const userId = getGuestUserId();
  if (!userId) throw new Error("no user");

  const res = await fetch(`/api/users/${userId}/favorites`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sport, gender, team_code }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "failed to save favorite");
  }
  return res.json();
}

export async function fetchDiaryById(id) {
  const res = await fetch(`/api/diaries/${id}`);
  if (!res.ok) throw new Error("Failed to fetch diary");
  return res.json();
}

export async function updateDiary(id, payload) {
  const res = await fetch(`/api/diaries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to update diary");
  return res.json();
}

export async function deleteDiaryById(id) {
  const res = await fetch(`/api/diaries/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete diary");
  return true;
}

export async function deleteDiary(id) {
  const res = await fetch(`/api/diaries/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "failed to delete diary");
  }
  return res.json();
}

export async function uploadDiaryPhotos(diaryId, formData) {
  const res = await fetch(`/api/diaries/${diaryId}/photos`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to upload photos");
  return res.json();
}

export async function fetchDiaryPhotos(diaryId) {
  const res = await fetch(`/api/diaries/${diaryId}/photos`);

  if (!res.ok) throw new Error("Failed to fetch photos");
  return res.json();
}

export async function deleteDiaryPhoto(diaryId, photoId) {
  const res = await fetch(`/api/diaries/${diaryId}/photos/${photoId}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Failed to delete photo");
  return res.json();
}

export async function fetchDiaryLikes(diaryId) {
  const userId = getGuestUserId();
  const qs = new URLSearchParams();
  if (userId) qs.set("userId", userId);

  const res = await fetch(`/api/diaries/${diaryId}/likes?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch likes");
  return res.json();
}

export async function likeDiary(diaryId) {
  const userId = getGuestUserId();
  const res = await fetch(`/api/diaries/${diaryId}/likes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error("Failed to like");
  return res.json();
}

export async function unlikeDiary(diaryId) {
  const userId = getGuestUserId();
  const qs = new URLSearchParams({ userId });
  const res = await fetch(`/api/diaries/${diaryId}/likes?${qs.toString()}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to unlike");
  return res.json();
}
