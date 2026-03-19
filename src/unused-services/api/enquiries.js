import { apiUrl } from "../config/api";

export async function sendEnquiry({ message, context = "", instructions = "" }) {
  const response = await fetch(apiUrl("/api/enquiries"), {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      context,
      instructions,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to process enquiry.");
  }

  return data;
}

export async function getGreetingLine({ userId = "", username = "" }) {
  const response = await fetch(apiUrl("/api/enquiries/greeting"), {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      username,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to load greeting.");
  }

  return data;
}
