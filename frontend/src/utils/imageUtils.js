import api from '../config/api'

/**
 * Get full image URL from relative path
 * @param {string} imageUrl - Relative or absolute image URL
 * @returns {string} Full image URL
 */
export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null
  
  // If it's already a full URL (http/https), return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // In development, use the API base URL to ensure images are loaded from backend
  // In production with proxy, relative URLs will work
  const API_BASE_URL = api.defaults.baseURL || ''
  
  // If it starts with /, prepend API base URL if in development
  if (imageUrl.startsWith('/')) {
    // Remove trailing slash from API_BASE_URL if exists
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
    // In development or if API_BASE_URL is set, prepend it
    if (import.meta.env.DEV && API_BASE_URL && !imageUrl.startsWith(API_BASE_URL)) {
      return `${baseUrl}${imageUrl}`
    }
    // In production with proxy, return as is
    return imageUrl
  }
  
  // Otherwise, assume it's a relative path and prepend /uploads/images/
  return imageUrl.startsWith('uploads/') ? `/${imageUrl}` : `/uploads/images/${imageUrl}`
}

/**
 * Get image source with fallback
 * @param {string} imageUrl - Image URL
 * @param {string} fallback - Fallback image URL
 * @returns {string} Image source URL
 */
export const getImageSrc = (imageUrl, fallback = null) => {
  const url = getImageUrl(imageUrl)
  return url || fallback || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo image%3C/text%3E%3C/svg%3E'
}

