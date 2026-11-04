import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { inputClass } from './ui';

/**
 * Password input with a show/hide toggle. Starts hidden and hides again
 * whenever its form is submitted. Extra props go to the <input>.
 */
export default function PasswordInput({ className = '', wrapperClassName = 'mt-1', ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return undefined;
    const hide = () => setVisible(false);
    form.addEventListener('submit', hide);
    return () => form.removeEventListener('submit', hide);
  }, []);

  const Icon = visible ? EyeOff : Eye;
  return (
    <span className={`relative block ${wrapperClassName}`}>
      <input ref={inputRef} {...inputProps} type={visible ? 'text' : 'password'} className={`${inputClass} pr-8 ${className}`} />
      <button
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-2 rounded-r-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt"
      >
        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}
