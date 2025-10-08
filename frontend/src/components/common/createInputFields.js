// frontend/src/components/common/createInputFields.js

export const createInputField = ({
  label,
  type,
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  ...props
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label} {required && "*"}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${
          error ? "border-red-500" : "border-gray-700"
        }`}
        {...props}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};
