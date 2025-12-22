import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Search } from 'lucide-react'

const DataTable = ({
  data = [],
  columns = [],
  loading = false,
  searchable = false,
  pagination = true,
  pageSize = 10,
  onRowClick,
  emptyMessage = 'Không có dữ liệu',
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  // Filter data
  const filteredData = searchable && searchTerm
    ? data.filter(row =>
        columns.some(col => {
          const value = col.accessor ? col.accessor(row) : row[col.key]
          return String(value).toLowerCase().includes(searchTerm.toLowerCase())
        })
      )
    : data

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0
    
    const aValue = columns.find(col => col.key === sortConfig.key)?.accessor
      ? columns.find(col => col.key === sortConfig.key).accessor(a)
      : a[sortConfig.key]
    const bValue = columns.find(col => col.key === sortConfig.key)?.accessor
      ? columns.find(col => col.key === sortConfig.key).accessor(b)
      : b[sortConfig.key]

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = pagination
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronUp className="w-4 h-4 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />
  }

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
      {searchable && (
        <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-slate-50/80 to-white/80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300/50 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm focus:shadow-md text-sm font-medium"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200/50">
          <thead className="bg-gradient-to-r from-slate-50/90 to-slate-100/90 backdrop-blur-sm sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider
                    ${column.sortable !== false ? 'cursor-pointer hover:bg-slate-100/90 transition-colors group' : ''}
                  `}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1.5">
                    <span>{column.header}</span>
                    {column.sortable !== false && <SortIcon columnKey={column.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white/50 divide-y divide-slate-200/50">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium text-sm">{emptyMessage}</p>
                    <p className="text-slate-400 text-xs mt-1">Thử thay đổi bộ lọc hoặc tìm kiếm</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={index}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`
                    transition-all duration-150
                    ${index % 2 === 0 ? 'bg-white/60' : 'bg-slate-50/40'}
                    ${onRowClick ? 'cursor-pointer hover:bg-blue-50/60 hover:shadow-sm hover:scale-[1.001]' : ''}
                    group
                  `}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 group-hover:text-slate-950 transition-colors">
                      {column.render ? column.render(row) : (column.accessor ? column.accessor(row) : row[column.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-200/50 bg-gradient-to-r from-slate-50/60 to-white/60 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-600 font-medium">
            Hiển thị <span className="text-slate-900 font-semibold">{(currentPage - 1) * pageSize + 1}</span> đến <span className="text-slate-900 font-semibold">{Math.min(currentPage * pageSize, sortedData.length)}</span> của <span className="text-slate-900 font-semibold">{sortedData.length}</span> kết quả
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-300/60 rounded-lg hover:bg-white/90 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 bg-white/80"
              aria-label="Trang trước"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <span className="text-sm text-slate-700 font-medium px-4">
              Trang <span className="text-slate-900 font-semibold">{currentPage}</span> / <span className="text-slate-900 font-semibold">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-300/60 rounded-lg hover:bg-white/90 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 bg-white/80"
              aria-label="Trang sau"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable

