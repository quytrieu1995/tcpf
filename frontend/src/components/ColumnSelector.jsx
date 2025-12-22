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
          <span className="ml-2 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
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
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-700">
              Đang hiển thị <span className="text-blue-600">{visibleCount}</span> / <span className="text-slate-900">{totalCount}</span> cột
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={handleDeselectAll}
                className="text-sm text-slate-600 hover:text-slate-700 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={selectedColumns.length <= 1}
              >
                Bỏ chọn tất cả
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={handleReset}
                className="text-sm text-slate-600 hover:text-slate-700 font-medium transition-colors"
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
                    flex items-center p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200
                    ${isSelected 
                      ? 'bg-blue-50 border-blue-300 shadow-sm' 
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }
                    ${isRequired ? 'opacity-60 cursor-not-allowed' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => !isRequired && handleToggleColumn(column.key)}
                    disabled={isRequired}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className={`ml-3 flex-1 text-sm font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                    {column.header}
                  </span>
                  {isRequired && (
                    <span className="text-xs text-slate-500 font-medium">(Bắt buộc)</span>
                  )}
                  {isSelected && !isRequired && (
                    <Check className="w-4 h-4 text-blue-600 ml-2" />
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

