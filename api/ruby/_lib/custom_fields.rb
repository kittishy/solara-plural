# frozen_string_literal: true

# Custom field value helpers for Ruby serverless functions.
# Mirrors the logic in lib/member-custom-fields.ts and lib/custom-fields.ts.
#
# Handles per-member custom field values stored in the member_field_values table.

require 'json'

module Solara
  module CustomFields
    # Read all saved custom field values for a member.
    # Returns a Hash { field_id => value }.
    def self.read_member_values(system_id, member_id)
      rows = Solara::Turso.execute(
        'SELECT field_id, value FROM member_field_values WHERE system_id = ? AND member_id = ?',
        [system_id, member_id]
      )
      rows.each_with_object({}) do |row, hash|
        hash[row['field_id']] = row['value'] if row['value']
      end
    end

    # Upsert / delete custom field values for a member.
    # raw_values should be a Hash { field_id => raw_value } (from JSON body).
    # Returns a Hash of successfully saved { field_id => normalized_value }.
    def self.save_member_values(system_id, member_id, raw_values)
      return {} unless raw_values.is_a?(Hash)
      return {} if raw_values.empty?

      # Load field definitions to validate types and select options
      fields = Solara::Turso.execute(
        'SELECT id, type, options FROM custom_fields WHERE system_id = ?',
        [system_id]
      )
      return {} if fields.empty?

      now    = Time.now.utc.to_i
      output = {}

      fields.each do |field|
        field_id = field['id']
        next unless raw_values.key?(field_id)

        type  = field['type'] || 'text'
        value = normalize_value(type, raw_values[field_id])

        # For select fields, reject values that are not in the options list
        if type == 'select' && value
          options = parse_options(field['options'])
          allowed = options.any? { |opt| opt.is_a?(Hash) ? opt['value'] == value : opt == value }
          value = nil unless allowed
        end

        if value
          row_id = Solara::Id.generate
          Solara::Turso.execute(
            <<~SQL,
              INSERT INTO member_field_values (id, system_id, member_id, field_id, value, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (member_id, field_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            SQL
            [row_id, system_id, member_id, field_id, value, now, now]
          )
          output[field_id] = value
        else
          # Blank or invalid value — remove the stored entry
          Solara::Turso.execute(
            'DELETE FROM member_field_values WHERE system_id = ? AND member_id = ? AND field_id = ?',
            [system_id, member_id, field_id]
          )
        end
      end

      output
    end

    # Normalise a raw value according to its field type.
    # Returns a String or nil if the value should be discarded.
    def self.normalize_value(type, value)
      # Checkbox always resolves to 'true' or 'false'
      if type == 'checkbox'
        return value == true || value == 'true' ? 'true' : 'false'
      end

      return nil unless value.is_a?(String)
      trimmed = value.strip
      return nil if trimmed.empty?

      case type
      when 'number'
        cleaned = trimmed.gsub(',', '.')
        cleaned =~ /\A-?\d+(\.\d+)?\z/ ? cleaned : nil
      when 'date'
        trimmed =~ /\A\d{4}-\d{2}-\d{2}\z/ ? trimmed : nil
      when 'long_text'
        trimmed[0, 4000]
      else
        trimmed[0, 500]
      end
    end

    def self.parse_options(raw)
      return [] unless raw
      JSON.parse(raw)
    rescue JSON::ParserError
      []
    end
  end
end
