import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

function InputField({
  label,
  id,
  type = 'text',
  name,
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  icon,
  onBlur,
  required = false,
  textarea = false,
  rows = 3
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="input-group">
      <label className="input-label" htmlFor={id}>
        {label}{required ? ' *' : ''}
      </label>
      {textarea ? (
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          rows={rows}
          className={`input-control ${error ? 'input-error' : ''}`}
          placeholder={placeholder}
        />
      ) : (
        <div className="input-wrapper">
          {icon && <span className="input-icon">{icon}</span>}
          <input
            id={id}
            type={inputType}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            autoComplete={autoComplete}
            className={`input-control ${error ? 'input-error' : ''}`}
            placeholder={placeholder}
            required={required}
          />
          {type === 'password' && (
            <button type="button" className="password-toggle" onClick={() => setShowPassword((prev) => !prev)}>
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          )}
        </div>
      )}
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}

export default InputField;
