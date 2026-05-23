"use client";

export type MemberCustomField = {
  id: string;
  name: string;
  description?: string | null;
  type: "text" | "long_text" | "number" | "date" | "checkbox" | "select";
  options: { label: string; value: string }[];
};

interface CustomFieldInputsProps {
  fields: MemberCustomField[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  disabled?: boolean;
}

export function CustomFieldInputs({
  fields,
  values,
  onChange,
  disabled = false,
}: CustomFieldInputsProps) {
  if (fields.length === 0) {
    return (
      <p className="text-caption-1 text-muted-foreground">
        Nenhum campo customizado. Crie em Configurações → Campos customizados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field) => {
        const value = values[field.id] ?? "";
        const id = `cf-${field.id}`;

        return (
          <div key={field.id} className="flex flex-col gap-1.5">
            <label
              htmlFor={id}
              className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide"
            >
              {field.name}
            </label>

            {field.type === "text" && (
              <input
                id={id}
                type="text"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(field.id, e.target.value)}
                maxLength={500}
                className="h-11 px-4 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body focus:outline-none focus:ring-2 focus:ring-ios-blue disabled:opacity-50"
              />
            )}

            {field.type === "long_text" && (
              <textarea
                id={id}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(field.id, e.target.value)}
                maxLength={4000}
                rows={4}
                className="min-h-[112px] px-4 py-3 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body resize-y focus:outline-none focus:ring-2 focus:ring-ios-blue disabled:opacity-50"
              />
            )}

            {field.type === "number" && (
              <input
                id={id}
                type="number"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="h-11 px-4 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body focus:outline-none focus:ring-2 focus:ring-ios-blue disabled:opacity-50"
              />
            )}

            {field.type === "date" && (
              <input
                id={id}
                type="date"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="h-11 px-4 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body focus:outline-none focus:ring-2 focus:ring-ios-blue disabled:opacity-50"
              />
            )}

            {field.type === "checkbox" && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  id={id}
                  type="checkbox"
                  checked={value === "true"}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange(field.id, e.target.checked ? "true" : "false")
                  }
                  className="w-5 h-5 rounded-ios-xs accent-ios-blue"
                />
                <span className="text-body">{value === "true" ? "Sim" : "Não"}</span>
              </label>
            )}

            {field.type === "select" && (
              <select
                id={id}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="h-11 px-3 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body focus:outline-none focus:ring-2 focus:ring-ios-blue disabled:opacity-50"
              >
                <option value="">— Não definido —</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {field.description && (
              <p className="text-caption-1 text-muted-foreground px-1">
                {field.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
