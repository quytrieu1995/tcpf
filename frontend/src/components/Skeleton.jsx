const Skeleton = ({ className = '', variant = 'default' }) => {
  const variants = {
    default: 'h-4 bg-gray-200 rounded animate-pulse',
    text: 'h-4 bg-gray-200 rounded animate-pulse',
    circle: 'h-12 w-12 bg-gray-200 rounded-full animate-pulse',
    rectangle: 'h-32 bg-gray-200 rounded animate-pulse',
    card: 'h-48 bg-gray-200 rounded-lg animate-pulse',
  }

  return <div className={`${variants[variant]} ${className}`} />
}

export const SkeletonTable = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <Skeleton variant="text" className="w-3/4 mb-4" />
      <Skeleton variant="text" className="w-1/2 mb-2" />
      <Skeleton variant="text" className="w-2/3" />
    </div>
  )
}

export default Skeleton

