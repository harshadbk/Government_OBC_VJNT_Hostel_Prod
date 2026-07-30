function Button({ label, variant = 'primary', type = 'button', onClick, fullWidth = false, loading = false, icon }) {
  return (
    <button
      type={type}
      className={`button ${variant} ${fullWidth ? 'full-width' : ''}`}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? (
        <span className="button-loader" />
      ) : (
        <>
          {icon && <span className="button-icon">{icon}</span>}
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export default Button;
