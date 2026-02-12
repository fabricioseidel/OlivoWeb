"use client";

import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  prefix?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, prefix, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-semibold text-gray-700"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {icon}
            </div>
          )}
          {prefix && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none select-none">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-4 py-2.5 rounded-xl border-2 
              bg-white
              placeholder-gray-400 
              text-gray-900
              transition-all duration-200
              focus:outline-none 
              focus:ring-2 
              focus:ring-offset-1
              ${icon ? 'pl-10' : ''}
              ${prefix ? 'pl-8' : ''}
              ${error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-500'
              }
              disabled:bg-gray-50 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm font-medium text-red-600 flex items-center gap-1">
            <span>⚠️</span>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
