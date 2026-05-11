'use client';

export type MemberCustomField = {
  id: string;
  name: string;
  description: string | null;
  type: 'text' | 'long_text' | 'number' | 'date' | 'checkbox' | 'select';
  options: Array<{ label: string; value: string }>;
};

type Props = {
  fields: MemberCustomField[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  disabled?: boolean;
};

export function CustomFieldInputs({ fields, values, onChange, disabled = false }: Props) {
  if (fields.length === 0) {
    return (
      <div className="rounded-xl border border-border-soft bg-surface-alt/40 p-4">
        <p className="text-sm font-medium text-text">Custom fields</p>
        <p className="mt-1 text-xs text-muted">
          Add profile fields in Settings to make member pages more complete.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border-soft bg-surface-alt/35 p-4" aria-labelledby="member-custom-fields-heading">
      <h2 id="member-custom-fields-heading" className="text-sm font-semibold text-text">
        Custom fields
      </h2>
      <p className="mt-1 text-xs text-muted">
        Fill only what feels useful for this member.
      </p>

      <div className="mt-4 space-y-4">
        {fields.map((field) => (
          <div key={field.id}>
            {renderField(field, values[field.id] ?? '', (value) => onChange(field.id, value), disabled)}
            {field.description && (
              <p className="mt-1 text-xs text-subtle">{field.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function renderField(
  field: MemberCustomField,
  value: string,
  onChange: (value: string) => void,
  disabled: boolean,
) {
  const inputId = `custom-field-${field.id}`;

  if (field.type === 'long_text') {
    return (
      <>
        <label htmlFor={inputId} className="label">{field.name}</label>
        <textarea
          id={inputId}
          className="input min-h-[112px] resize-y"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
      </>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-border-soft bg-surface/50 px-3 py-2">
        <span>
          <span className="block text-sm font-medium text-text">{field.name}</span>
        </span>
        <input
          id={inputId}
          type="checkbox"
          className="h-5 w-5 accent-primary"
          checked={value === 'true'}
          onChange={(event) => onChange(event.target.checked ? 'true' : 'false')}
          disabled={disabled}
        />
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <>
        <label htmlFor={inputId} className="label">{field.name}</label>
        <select
          id={inputId}
          className="input min-h-[44px]"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        >
          <option value="">Not set</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </>
    );
  }

  return (
    <>
      <label htmlFor={inputId} className="label">{field.name}</label>
      <input
        id={inputId}
        className="input"
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </>
  );
}
