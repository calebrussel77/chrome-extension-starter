import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
}) => {
  const handleChange = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  // Size mappings
  const sizes = {
    sm: {
      switch: "w-8 h-4",
      dot: "h-3 w-3",
      translate: "translate-x-4",
    },
    md: {
      switch: "w-11 h-6",
      dot: "h-5 w-5",
      translate: "translate-x-5",
    },
    lg: {
      switch: "w-14 h-7",
      dot: "h-6 w-6",
      translate: "translate-x-7",
    },
  };

  return (
    <div className="flex items-center">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`relative inline-flex flex-shrink-0 ${
          sizes[size].switch
        } rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? "bg-blue-600" : "bg-gray-200"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={handleChange}
        disabled={disabled}
      >
        <span
          className={`inline-block ${
            sizes[size].dot
          } transform rounded-full bg-white transition duration-200 ease-in-out ${
            checked ? sizes[size].translate : "translate-x-0"
          }`}
        />
      </button>

      {(label || description) && (
        <div className="ml-3">
          {label && (
            <span
              className={`text-sm font-medium ${
                disabled ? "text-gray-400" : "text-gray-900"
              }`}
            >
              {label}
            </span>
          )}

          {description && (
            <p
              className={`text-xs ${
                disabled ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Toggle;
