export type ContactFormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  message: string;
};

export async function submitContactForm(data: ContactFormData) {
  const response = await fetch("/api/send-mail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to send your enquiry.");
  }
  return result;
}