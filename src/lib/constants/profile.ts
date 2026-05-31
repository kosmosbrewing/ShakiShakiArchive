export const ADMIN_PROFILE_IMAGE_URL =
  "https://res.cloudinary.com/diyuvt3qg/image/upload/v1780206155/shakishaki/products/s8awlrfvghop4yuyskd7.png";

export function getUserProfileImageUrl(
  user?: { isAdmin?: boolean } | null,
) {
  if (user?.isAdmin) return ADMIN_PROFILE_IMAGE_URL;
  return null;
}
