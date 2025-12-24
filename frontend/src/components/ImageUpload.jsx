import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useToast } from './ToastContainer'
import api from '../config/api'
import { getImageUrl } from '../utils/imageUtils'

const ImageUpload = ({ images = [], onChange, maxImages = 5, maxSizeMB = 5 }) => {
  const toast = useToast()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    
    if (images.length + files.length > maxImages) {
      toast.error(`Chỉ được upload tối đa ${maxImages} ảnh`)
      return
    }

    // Validate file types and sizes
    const validFiles = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} không phải là ảnh`)
        continue
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`File ${file.name} vượt quá ${maxSizeMB}MB`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    setUploading(true)
    try {
      const uploadedUrls = []
      
      for (const file of validFiles) {
        const formData = new FormData()
        formData.append('image', file)
        
        // Use api instance to ensure proper base URL and auth headers
        const response = await api.post('/upload/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        if (response.data && response.data.url) {
          uploadedUrls.push(response.data.url)
        } else {
          throw new Error(`Upload failed for ${file.name}`)
        }
      }
      
      onChange([...images, ...uploadedUrls])
      toast.success(`Đã upload ${uploadedUrls.length} ảnh thành công`)
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi upload ảnh'
      toast.error(errorMessage)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = (index) => {
    const newImages = images.filter((_, i) => i !== index)
    onChange(newImages)
  }

  const handleSetPrimary = (index) => {
    if (index === 0) return // Already primary
    const newImages = [images[index], ...images.filter((_, i) => i !== index)]
    onChange(newImages)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Hình ảnh sản phẩm {images.length > 0 && <span className="text-gray-500">({images.length}/{maxImages})</span>}
      </label>
      
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
              <p className="text-sm text-gray-600">Đang upload...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Click để chọn ảnh hoặc kéo thả ảnh vào đây
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Tối đa {maxImages} ảnh, mỗi ảnh tối đa {maxSizeMB}MB
              </p>
            </div>
          )}
        </div>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((imageUrl, index) => {
            return (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all"
            >
              <img
                src={getImageUrl(imageUrl) || ''}
                alt={`Product ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Image load error:', imageUrl)
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E'
                }}
              />
              
              {/* Primary Badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded">
                  Ảnh chính
                </div>
              )}
              
              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {index !== 0 && (
                  <button
                    onClick={() => handleSetPrimary(index)}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                    title="Đặt làm ảnh chính"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleRemove(index)}
                  className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                  title="Xóa ảnh"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* URL Input Fallback */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Hoặc nhập URL ảnh
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const url = e.target.value.trim()
                if (url && images.length < maxImages) {
                  if (!images.includes(url)) {
                    onChange([...images, url])
                    e.target.value = ''
                    toast.success('Đã thêm ảnh từ URL')
                  } else {
                    toast.warning('Ảnh này đã được thêm')
                  }
                }
              }
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              const input = e.target.previousElementSibling
              const url = input.value.trim()
              if (url && images.length < maxImages) {
                if (!images.includes(url)) {
                  onChange([...images, url])
                  input.value = ''
                  toast.success('Đã thêm ảnh từ URL')
                } else {
                  toast.warning('Ảnh này đã được thêm')
                }
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Thêm
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImageUpload

