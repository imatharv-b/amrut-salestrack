export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`${sizeClasses[size]} border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin`} 
        style={{ borderWidth: '3px' }}
      />
      {text && <p className="text-sm text-gray-500 font-medium">{text}</p>}
    </div>
  )
}
