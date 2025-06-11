// src/components/Button.jsx
import React from 'react';

export default function Button({ children, onClick, className }) {
  return (
    <button
      className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 ${className || ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
