import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'

const DateRangeSelector = ({ onDateRangeChange, defaultStartDate, defaultEndDate }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('custom')
  const [startDate, setStartDate] = useState(defaultStartDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(defaultEndDate || new Date().toISOString().split('T')[0])

  const periods = [
    { value: 'today', label: 'Hôm nay', days: 0 },
    { value: 'yesterday', label: 'Hôm qua', days: 1 },
    { value: 'week', label: '7 ngày qua', days: 7 },
    { value: 'month', label: '30 ngày qua', days: 30 },
    { value: 'last-week', label: 'Tuần trước', days: -7 },
    { value: 'last-month', label: 'Tháng trước', days: -30 },
    { value: 'this-month', label: 'Tháng này', days: 'this-month' },
    { value: 'last-3-months', label: '3 tháng qua', days: 90 },
    { value: 'custom', label: 'Tùy chỉnh', days: null }
  ]

  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period.value)
    setIsOpen(false)

    if (period.days === null) {
      // Custom - keep current dates
      return
    }

    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const end = new Date(today)

    let start
    if (period.days === 'this-month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      start.setHours(0, 0, 0, 0)
    } else if (period.days === 0) {
      // Today
      start = new Date(today)
      start.setHours(0, 0, 0, 0)
    } else if (period.days === 1) {
      // Yesterday
      start = new Date(today)
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end.setDate(end.getDate() - 1)
      end.setHours(23, 59, 59, 999)
    } else if (period.days < 0) {
      // Last week/month
      const absDays = Math.abs(period.days)
      if (absDays === 7) {
        // Last week: 7 days ago to 1 day ago
        start = new Date(today)
        start.setDate(start.getDate() - 14)
        start.setHours(0, 0, 0, 0)
        end = new Date(today)
        end.setDate(end.getDate() - 7)
        end.setHours(23, 59, 59, 999)
      } else if (absDays === 30) {
        // Last month: 30 days ago to 1 day ago
        start = new Date(today)
        start.setDate(start.getDate() - 60)
        start.setHours(0, 0, 0, 0)
        end = new Date(today)
        end.setDate(end.getDate() - 30)
        end.setHours(23, 59, 59, 999)
      } else {
        start = new Date(today)
        start.setDate(start.getDate() - absDays * 2)
        start.setHours(0, 0, 0, 0)
        end.setDate(end.getDate() - absDays)
        end.setHours(23, 59, 59, 999)
      }
    } else {
      // X days ago
      start = new Date(today)
      start.setDate(start.getDate() - period.days)
      start.setHours(0, 0, 0, 0)
    }

    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]

    setStartDate(startStr)
    setEndDate(endStr)
    onDateRangeChange({ start_date: startStr, end_date: endStr })
  }

  const handleCustomDateChange = () => {
    if (startDate && endDate && startDate <= endDate) {
      onDateRangeChange({ start_date: startDate, end_date: endDate })
    }
  }

  const getCurrentPeriodLabel = () => {
    const period = periods.find(p => p.value === selectedPeriod)
    if (selectedPeriod === 'custom') {
      return `${startDate} - ${endDate}`
    }
    return period?.label || 'Tùy chỉnh'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg hover:bg-white hover:shadow-md transition-all duration-200 text-sm font-medium text-gray-700"
      >
        <Calendar className="w-4 h-4" />
        <span>{getCurrentPeriodLabel()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-72 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 z-20 animate-slide-up">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Chọn khoảng thời gian</h3>
              
              {/* Quick Periods */}
              <div className="space-y-1 mb-4">
                {periods.filter(p => p.value !== 'custom').map((period) => (
                  <button
                    key={period.value}
                    onClick={() => handlePeriodSelect(period)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                      selectedPeriod === period.value
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Range */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Tùy chỉnh</p>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Từ ngày</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value)
                        setSelectedPeriod('custom')
                      }}
                      onBlur={handleCustomDateChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Đến ngày</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value)
                        setSelectedPeriod('custom')
                      }}
                      onBlur={handleCustomDateChange}
                      min={startDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => {
                      handleCustomDateChange()
                      setIsOpen(false)
                    }}
                    className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default DateRangeSelector

