import { createClient } from "@supabase/supabase-js";

export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;

export type StoreRecord = {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  currency: string;
  shippingMinorUnits: number;
  freeShippingThreshold: number;
  publishedVersionId: string | null;
};
export type CatalogProduct = {
  id: string;
  title: string;
  slug: string;
  description: string;
  sku: string;
  priceMinorUnits: number;
  stockQuantity: number;
  status: string;
};
export type Section = {
  id: string;
  type: "Hero" | "FeaturedProducts" | "ImageText" | "Announcement" | "Footer";
  title: string;
  text: string;
  image: string;
  button: string;
};
export type PageDocument = {
  schemaVersion: number;
  accent: string;
  font: string;
  sections: Section[];
};
export type LiveOrder = {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  address: string;
  itemsJson: string;
  paymentState: string;
  fulfillmentState: string;
  trackingNumber: string;
  trackingUrl: string;
  total: number;
  subtotal: number;
  shipping: number;
  createdAt: string;
};

export async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  let token: string | undefined;
  if (authenticated) {
    const session = await supabase?.auth.getSession();
    token = session?.data.session?.access_token;
    if (!token) throw new Error("Sign in to continue.");
  }
  let response: Response;
  try {
    response = await fetch(apiUrl + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "The API is unavailable. Check that it is running, then retry.",
    );
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error ??
        (response.status === 401
          ? "Your session needs refreshing. Sign in again."
          : response.status === 404
            ? "This store or resource is unavailable."
            : "The request failed. Please retry."),
    );
  }
  return response.json();
}
