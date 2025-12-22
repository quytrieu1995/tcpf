import { useState, useEffect } from 'react'
import { Settings2, Check, X } from 'lucide-react'
import Button from './Button'
import Modal from './Modal'

const ColumnSelector = ({ columns, visibleColumns, onColumnsChange, storageKey }) => {
  const [showModal, setShowModal] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState(visibleColumns || [])

  // Load saved preferences on mount only
  useEffect(() => {
    if (storageKey && visibleColumns.length === 0) {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const savedColumns = JSON.parse(saved)
          setSelectedColumns(savedColumns)
        }
      } catch (error) {
        console.error('Error loading column preferences:', error)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setSelectedColumns(visibleColumns || [])
  }, [visibleColumns])

  const handleToggleColumn = (columnKey) => {
    setSelectedColumns(prev => {
      if (prev.includes(columnKey)) {
        // Don't allow hiding all columns - keep at least one visible
        if (prev.length === 1) {
          return prev
        }
        return prev.filter(key => key !== columnKey)
      } else {
        return [...prev, columnKey]
      }
    })
  }

  const handleSelectAll = () => {
    const allKeys = columns.map(col => col.key)
    setSelectedColumns(allKeys)
  }

  const handleDeselectAll = () => {
    // Keep at least one column visible
    if (selectedColumns.length > 1) {
      setSelectedColumns([columns[0]?.key].filter(Boolean))
    }
  }

  const handleReset = () => {
    // Reset to default: all columns visible
    const allKeys = columns.map(col => col.key)
    setSelectedColumns(allKeys)
  }

  const handleSave = () => {
    onColumnsChange(selectedColumns)
    
    // Save to localStorage
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(selectedColumns))
      } catch (error) {
        console.error('Error saving column preferences:', error)
      }
    }
    
    setShowModal(false)
  }

  const handleCancel = () => {
    // Revert to current visible columns
    setSelectedColumns(visibleColumns || [])
    setShowModal(false)
  }

  const visibleCount = selectedColumns.length
  const totalCount = columns.length

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowModal(true)}
        className="relative"
      >
        <Settings2 className="w-4 h-4 mr-2" />
        Cột
        {visibleCount < totalCount && (
          <span className="ml-2 bg-primary-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
            {visibleCount}
          </span>
        )}
      </Button>

      <Modal
        isOpen={showModal}
        onClose={handleCancel}
        title="Tùy chọn cột hiển thị"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="text-sm text-gray-600">
              Đang hiển thị {visibleCount} / {totalCount} cột
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Chọn tất cả
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={handleDeselectAll}
                className="text-sm text-gray-600 hover:text-gray-700"
                disabled={selectedColumns.length <= 1}
              >
                Bỏ chọn tất cả
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={handleReset}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                Đặt lại
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {columns.map((column) => {
              const isSelected = selectedColumns.includes(column.key)
              const isRequired = column.required || column.key === 'actions' // Actions column is usually required
              
              return (
                <label
                  key={column.key}
                  className={`
                    flex items-center p-3 rounded-lg border cursor-pointer transition-colors
                    ${isSelected 
                      ? 'bg-primary-50 border-primary-200' 
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                    }
                    ${isRequired ? 'opacity-60 cursor-not-allowed' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => !isRequired && handleToggleColumn(column.key)}
                    disabled={isRequired}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-3 flex-1 text-sm font-medium text-gray-900">
                    {column.header}
                  </span>
                  {isRequired && (
                    <span className="text-xs text-gray-500">(Bắt buộc)</span>
                  )}
                  {isSelected && !isRequired && (
                    <Check className="w-4 h-4 text-primary-600 ml-2" />
                  )}
                </label>
              )
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              <X className="w-4 h-4 mr-2" />
              Hủy
            </Button>
            <Button onClick={handleSave}>
              <Check className="w-4 h-4 mr-2" />
              Lưu
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default ColumnSelector

