import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-mono rounded-lg transition-all duration-200 disabled:cursor-not-allowed'
  
  const variantStyles = {
    primary: 'bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500/30 disabled:bg-gray-700',
    secondary: 'bg-gray-800 hover:bg-gray-700 text-cyan-100 border border-cyan-800 disabled:bg-gray-800',
    danger: 'bg-red-600 hover:bg-red-500 text-white border border-red-500/30 disabled:bg-gray-700',
    ghost: 'bg-transparent hover:bg-cyan-900/20 text-cyan-100 disabled:text-gray-600',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const hoverEffect = variant !== 'ghost' && !disabled ? 'hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]' : ''

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${hoverEffect} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
