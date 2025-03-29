import { ChevronDownIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  fullWidth?: boolean;
  description?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  label,
  error,
  fullWidth = false,
  className = "",
  disabled,
  description,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Find the current selected option label
  const selectedOptionLabel =
    options.find((option) => option.value === value)?.label || "";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // Base classes
  const baseClasses =
    "block rounded-md border px-3 py-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 cursor-pointer";

  // Width classes
  const widthClasses = fullWidth ? "w-full" : "";

  // Error classes
  const errorClasses = error
    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
    : "";

  // Combined classes
  const combinedClasses = `${baseClasses} ${widthClasses} ${errorClasses} ${className}`;

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label
          htmlFor={props.id}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}

      {description && (
        <p className="text-xs text-gray-500 mb-1">{description}</p>
      )}

      <div className="relative" ref={selectRef}>
        {/* Custom select trigger */}
        <div
          className={combinedClasses}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <div className="flex justify-between items-center">
            <span>{selectedOptionLabel}</span>
            <ChevronDownIcon
              className={`h-5 w-5 text-gray-400 transition-transform ${
                isOpen ? "transform rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Custom dropdown */}
        {isOpen && (
          <div
            className="absolute mt-1 w-full rounded-md bg-white shadow-lg z-50 border border-gray-200 max-h-60 overflow-auto"
            style={{ zIndex: 9999 }}
          >
            <ul className="py-1">
              {options.map((option) => (
                <li
                  key={option.value}
                  className={`px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer ${
                    option.value === value ? "bg-blue-100 font-medium" : ""
                  }`}
                  onClick={() => handleSelectOption(option.value)}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Hidden native select for form submission if needed */}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          disabled={disabled}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Select;
