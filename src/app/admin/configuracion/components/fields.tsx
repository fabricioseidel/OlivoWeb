"use client";

// Componentes de entrada reutilizables
interface InputFieldProps {
  label: string;
  value: any;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  hint?: string;
  prefix?: string;
  suffix?: string;
}

export function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
  hint,
  prefix,
  suffix,
}: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-2">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${prefix ? "pl-7" : ""
            } ${suffix ? "pr-12" : ""}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {maxLength && <p className="text-xs text-slate-400 mt-1">{value.length}/{maxLength}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: any;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: any;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  hint?: string;
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  hint,
}: TextAreaFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
      />
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {maxLength && <p className="text-xs text-slate-400 mt-1">{value.length}/{maxLength}</p>}
    </div>
  );
}

interface CheckBoxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CheckBoxField({ label, checked, onChange }: CheckBoxFieldProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-sm font-medium text-slate-900">{label}</span>
    </label>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

export function ColorField({ label, value, onChange, description }: ColorFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 border border-slate-300 rounded-lg cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm font-mono"
        />
      </div>
      {description && <p className="text-xs text-slate-500 mt-2">{description}</p>}
    </div>
  );
}
