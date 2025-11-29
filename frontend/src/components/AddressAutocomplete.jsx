import { useState, useEffect, useRef } from 'react'
import api from '../config/api'
import { MapPin, ChevronDown, Search, X, Clock, CheckCircle } from 'lucide-react'

const STORAGE_KEY = 'recent_addresses'
const MAX_RECENT_ADDRESSES = 10

const AddressAutocomplete = ({ 
  value = '', 
  onChange, 
  onAddressChange,
  placeholder = 'Nhập địa chỉ...',
  className = '',
  error,
  required = false
}) => {
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [wards, setWards] = useState([])
  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedWard, setSelectedWard] = useState('')
  const [detailAddress, setDetailAddress] = useState('')
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingWards, setLoadingWards] = useState(false)
  const [showDropdowns, setShowDropdowns] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [recentAddresses, setRecentAddresses] = useState([])
  const [showRecentAddresses, setShowRecentAddresses] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [isValid, setIsValid] = useState(false)
  const [pendingAddress, setPendingAddress] = useState(null)
  const wrapperRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    fetchProvinces()
    loadRecentAddresses()
  }, [])

  useEffect(() => {
    // Parse existing value if provided
    if (value && provinces.length > 0 && !selectedProvince && !selectedDistrict && !selectedWard) {
      parseAddress(value)
    }
  }, [value, provinces])

  useEffect(() => {
    if (selectedProvince) {
      fetchDistricts(selectedProvince)
    } else {
      setDistricts([])
      setWards([])
    }
  }, [selectedProvince])

  useEffect(() => {
    if (selectedDistrict) {
      fetchWards(selectedDistrict)
    } else {
      setWards([])
    }
  }, [selectedDistrict])

  // Note: Ward application is now handled in fetchWards function

  useEffect(() => {
    // Update full address when selections change
    if (provinces.length > 0) {
      updateFullAddress()
      validateAddress()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvince, selectedDistrict, selectedWard, detailAddress])

  useEffect(() => {
    // Search functionality
    if (searchQuery.length >= 2) {
      performSearch(searchQuery)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }
  }, [searchQuery])

  useEffect(() => {
    // Handle click outside
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdowns(false)
        setShowSearchResults(false)
        setShowRecentAddresses(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadRecentAddresses = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const addresses = JSON.parse(stored)
        setRecentAddresses(addresses)
      }
    } catch (error) {
      console.error('Error loading recent addresses:', error)
    }
  }

  const saveRecentAddress = (addressData) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      let addresses = stored ? JSON.parse(stored) : []
      
      // Remove if already exists
      addresses = addresses.filter(addr => addr.fullAddress !== addressData.fullAddress)
      
      // Add to beginning
      addresses.unshift({
        ...addressData,
        savedAt: new Date().toISOString()
      })
      
      // Keep only last MAX_RECENT_ADDRESSES
      addresses = addresses.slice(0, MAX_RECENT_ADDRESSES)
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses))
      setRecentAddresses(addresses)
    } catch (error) {
      console.error('Error saving recent address:', error)
    }
  }

  const removeRecentAddress = (index) => {
    try {
      const newAddresses = recentAddresses.filter((_, i) => i !== index)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAddresses))
      setRecentAddresses(newAddresses)
    } catch (error) {
      console.error('Error removing recent address:', error)
    }
  }

  const fetchProvinces = async () => {
    try {
      setLoadingProvinces(true)
      const response = await api.get('/address/provinces')
      setProvinces(response.data || [])
    } catch (error) {
      console.error('Error fetching provinces:', error)
    } finally {
      setLoadingProvinces(false)
    }
  }

  const fetchDistricts = async (provinceCode) => {
    try {
      setLoadingDistricts(true)
      const response = await api.get(`/address/districts/${provinceCode}`)
      setDistricts(response.data || [])
      // Reset district and ward when province changes
      setSelectedDistrict('')
      setSelectedWard('')
    } catch (error) {
      console.error('Error fetching districts:', error)
    } finally {
      setLoadingDistricts(false)
    }
  }

  const fetchWards = async (districtCode) => {
    try {
      setLoadingWards(true)
      const response = await api.get(`/address/wards/${districtCode}`)
      const newWards = response.data || []
      setWards(newWards)
      
      // If we have a pending address, try to apply ward
      if (pendingAddress && pendingAddress.ward) {
        const district = districts.find(d => d.code === districtCode)
        if (district && district.name === pendingAddress.district) {
          const ward = newWards.find(w => w.name === pendingAddress.ward)
          if (ward) {
            setSelectedWard(ward.code)
            setPendingAddress(null) // Clear pending after applying
            return // Don't reset ward
          }
        }
      }
      
      // Reset ward when district changes (no pending address or no match)
      setSelectedWard('')
    } catch (error) {
      console.error('Error fetching wards:', error)
    } finally {
      setLoadingWards(false)
    }
  }

  const performSearch = (query) => {
    const results = []
    const lowerQuery = query.toLowerCase()
    
    // Search in provinces
    provinces.forEach(province => {
      if (province.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'province',
          code: province.code,
          name: province.name,
          display: province.name
        })
      }
    })
    
    // Search in districts (if province is selected)
    if (selectedProvince) {
      districts.forEach(district => {
        if (district.name.toLowerCase().includes(lowerQuery)) {
          results.push({
            type: 'district',
            code: district.code,
            name: district.name,
            display: `${district.name}, ${getProvinceName(selectedProvince)}`
          })
        }
      })
    }
    
    // Search in wards (if district is selected)
    if (selectedDistrict) {
      wards.forEach(ward => {
        if (ward.name.toLowerCase().includes(lowerQuery)) {
          results.push({
            type: 'ward',
            code: ward.code,
            name: ward.name,
            display: `${ward.name}, ${getDistrictName(selectedDistrict)}, ${getProvinceName(selectedProvince)}`
          })
        }
      })
    }
    
    // Search in recent addresses
    recentAddresses.forEach(addr => {
      if (addr.fullAddress.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'recent',
          address: addr,
          display: addr.fullAddress
        })
      }
    })
    
    setSearchResults(results.slice(0, 10)) // Limit to 10 results
    setShowSearchResults(results.length > 0)
  }

  const handleSearchSelect = (result) => {
    if (result.type === 'province') {
      setSelectedProvince(result.code)
      setSearchQuery('')
      setShowSearchResults(false)
    } else if (result.type === 'district') {
      setSelectedDistrict(result.code)
      setSearchQuery('')
      setShowSearchResults(false)
    } else if (result.type === 'ward') {
      setSelectedWard(result.code)
      setSearchQuery('')
      setShowSearchResults(false)
    } else if (result.type === 'recent') {
      applyAddress(result.address)
      setSearchQuery('')
      setShowSearchResults(false)
    }
  }

  const applyAddress = (addressData) => {
    // Find and set province
    const province = provinces.find(p => p.name === addressData.province)
    if (province) {
      setSelectedProvince(province.code)
      setDetailAddress(addressData.detail || '')
      
      // Store pending address to apply after districts/wards load
      if (addressData.district || addressData.ward) {
        setPendingAddress(addressData)
      }
      
      // Fetch districts - fetchDistricts will handle applying district if pendingAddress is set
      fetchDistricts(province.code)
    } else {
      // Just set detail if no province match
      setDetailAddress(addressData.detail || '')
    }
  }

  const parseAddress = (address) => {
    if (!address || !provinces.length) return

    // Try to find province
    const province = provinces.find(p => address.includes(p.name))
    if (province) {
      setSelectedProvince(province.code)
    }
  }

  const validateAddress = () => {
    setValidationError('')
    setIsValid(false)

    if (required) {
      if (!detailAddress.trim() && !selectedProvince) {
        setValidationError('Vui lòng nhập địa chỉ chi tiết hoặc chọn tỉnh/thành phố')
        return false
      }
    }

    // Basic validation
    if (selectedProvince && !selectedDistrict && detailAddress.length > 0) {
      // Warning but not error
      setIsValid(true)
      return true
    }

    if (selectedProvince && selectedDistrict && selectedWard && detailAddress.trim()) {
      setIsValid(true)
      return true
    }

    return false
  }

  const updateFullAddress = () => {
    const parts = []
    if (detailAddress) parts.push(detailAddress)
    if (selectedWard) {
      const ward = wards.find(w => w.code === selectedWard)
      if (ward) parts.push(ward.name)
    }
    if (selectedDistrict) {
      const district = districts.find(d => d.code === selectedDistrict)
      if (district) parts.push(district.name)
    }
    if (selectedProvince) {
      const province = provinces.find(p => p.code === selectedProvince)
      if (province) parts.push(province.name)
    }

    const fullAddress = parts.join(', ')
    
    if (onChange) {
      onChange(fullAddress)
    }
    
    if (onAddressChange) {
      const addressData = {
        fullAddress,
        province: provinces.find(p => p.code === selectedProvince)?.name || '',
        district: districts.find(d => d.code === selectedDistrict)?.name || '',
        ward: wards.find(w => w.code === selectedWard)?.name || '',
        detail: detailAddress
      }
      onAddressChange(addressData)
      
      // Save to recent addresses if valid
      if (isValid && fullAddress) {
        saveRecentAddress(addressData)
      }
    }
  }

  const getProvinceName = (code) => {
    return provinces.find(p => p.code === code)?.name || ''
  }

  const getDistrictName = (code) => {
    return districts.find(d => d.code === code)?.name || ''
  }

  const getWardName = (code) => {
    return wards.find(w => w.code === code)?.name || ''
  }

  const handleRecentAddressSelect = (addressData) => {
    applyAddress(addressData)
    setShowRecentAddresses(false)
  }

  return (
    <div ref={wrapperRef} className={`space-y-2 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSearchResults(true)
            }}
            onFocus={() => {
              if (recentAddresses.length > 0 && !searchQuery) {
                setShowRecentAddresses(true)
              }
            }}
            placeholder="Tìm kiếm tỉnh, quận, phường..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setShowSearchResults(false)
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSearchSelect(result)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">{result.display}</span>
                <span className="ml-auto text-xs text-gray-500">
                  {result.type === 'province' ? 'Tỉnh/TP' :
                   result.type === 'district' ? 'Quận/Huyện' :
                   result.type === 'ward' ? 'Phường/Xã' : 'Đã lưu'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Recent Addresses Dropdown */}
        {showRecentAddresses && recentAddresses.length > 0 && !searchQuery && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Địa chỉ đã dùng</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRecentAddresses(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Đóng
              </button>
            </div>
            {recentAddresses.map((address, index) => (
              <div
                key={index}
                className="px-4 py-2 hover:bg-gray-50 flex items-center justify-between group"
              >
                <button
                  type="button"
                  onClick={() => handleRecentAddressSelect(address)}
                  className="flex-1 text-left"
                >
                  <p className="text-sm text-gray-900">{address.fullAddress}</p>
                  {address.detail && (
                    <p className="text-xs text-gray-500 mt-1">{address.detail}</p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeRecentAddress(index)
                  }}
                  className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick select dropdowns */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setShowDropdowns(!showDropdowns)
            setShowRecentAddresses(false)
            setShowSearchResults(false)
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:text-primary-700 border border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
        >
          <MapPin className="w-4 h-4" />
          <span>Chọn địa chỉ</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showDropdowns ? 'rotate-180' : ''}`} />
        </button>
        {isValid && (
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Hợp lệ</span>
          </div>
        )}
      </div>

      {showDropdowns && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {/* Province */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tỉnh/Thành phố {required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={loadingProvinces}
            >
              <option value="">Chọn tỉnh/thành phố</option>
              {provinces.map(province => (
                <option key={province.code} value={province.code}>
                  {province.name}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Quận/Huyện
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={!selectedProvince || loadingDistricts}
            >
              <option value="">Chọn quận/huyện</option>
              {districts.map(district => (
                <option key={district.code} value={district.code}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ward */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Phường/Xã
            </label>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={!selectedDistrict || loadingWards}
            >
              <option value="">Chọn phường/xã</option>
              {wards.map(ward => (
                <option key={ward.code} value={ward.code}>
                  {ward.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Detail Address Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Địa chỉ chi tiết (Số nhà, tên đường) {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          value={detailAddress}
          onChange={(e) => setDetailAddress(e.target.value)}
          onBlur={validateAddress}
          placeholder="Ví dụ: 123 Đường ABC"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            error || validationError ? 'border-red-300' : isValid ? 'border-green-300' : 'border-gray-300'
          }`}
        />
        {(error || validationError) && (
          <p className="mt-1 text-sm text-red-600">{error || validationError}</p>
        )}
        {isValid && !error && !validationError && (
          <p className="mt-1 text-sm text-green-600">Địa chỉ hợp lệ</p>
        )}
      </div>

      {/* Preview Full Address */}
      {(selectedProvince || selectedDistrict || selectedWard || detailAddress) && (
        <div className={`p-3 rounded-lg border ${
          isValid ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <p className="text-xs font-medium mb-1" style={{ color: isValid ? '#065f46' : '#1e40af' }}>
            Địa chỉ đầy đủ:
          </p>
          <p className="text-sm" style={{ color: isValid ? '#047857' : '#1e3a8a' }}>
            {[
              detailAddress,
              getWardName(selectedWard),
              getDistrictName(selectedDistrict),
              getProvinceName(selectedProvince)
            ].filter(Boolean).join(', ') || 'Chưa có địa chỉ'}
          </p>
        </div>
      )}
    </div>
  )
}

export default AddressAutocomplete
