# frozen_string_literal: true

# /api/ruby/members — Members collection endpoints
#
# GET  /api/ruby/members  — list active members for current system
# POST /api/ruby/members  — create a new member
#
# Per-member endpoints: api/ruby/members/[id].rb

require_relative '_lib/turso'
require_relative '_lib/auth'
require_relative '_lib/response'
require_relative '_lib/request'
require_relative '_lib/id'
require_relative '_lib/custom_fields'
require 'json'

Handler = Proc.new do |req, res|
  system_id = Solara::Auth.system_id(req)
  unless system_id
    Solara::Response.unauthorized(res)
    next
  end

  case req.request_method
  when 'GET'
    rows = Solara::Turso.execute(
      <<~SQL,
        SELECT id, name, pronouns, role, tags, color, avatar_url
        FROM members
        WHERE system_id = ? AND is_archived = 0
        ORDER BY name ASC
      SQL
      [system_id]
    )

    members = rows.map do |row|
      tags = row['tags'] ? (JSON.parse(row['tags']) rescue []) : []
      {
        id:        row['id'],
        name:      row['name'],
        pronouns:  row['pronouns'],
        role:      row['role'],
        tags:      tags,
        color:     row['color'],
        avatarUrl: row['avatar_url'],
      }
    end

    Solara::Response.ok(res, members)

  when 'POST'
    body = Solara::Request.require_json_object(req, res)
    next unless body

    name = Solara::Request.required_string(body, 'name')
    unless name
      Solara::Response.err(res, 'name is required')
      next
    end

    raw_tags = body['tags']
    tags = if raw_tags.is_a?(Array)
      raw_tags.select { |t| t.is_a?(String) && !t.strip.empty? }.map(&:strip)
    else
      []
    end

    id          = Solara::Id.generate
    now         = Time.now.utc.to_i
    pronouns    = Solara::Request.optional_string(body, 'pronouns')
    avatar_url  = Solara::Request.optional_string(body, 'avatarUrl')
    description = Solara::Request.optional_string(body, 'description')
    color       = Solara::Request.optional_string(body, 'color')
    role        = Solara::Request.optional_string(body, 'role')
    notes       = Solara::Request.optional_string(body, 'notes')
    tags_json   = tags.any? ? JSON.generate(tags) : nil

    Solara::Turso.execute(
      <<~SQL,
        INSERT INTO members
          (id, system_id, name, pronouns, avatar_url, description, color, role, tags, notes, is_archived, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      SQL
      [id, system_id, name, pronouns, avatar_url, description, color, role, tags_json, notes, now, now]
    )

    custom_field_values = Solara::CustomFields.save_member_values(
      system_id, id, body['customFieldValues']
    )

    Solara::Response.ok(res, {
      id:                id,
      systemId:          system_id,
      name:              name,
      pronouns:          pronouns,
      avatarUrl:         avatar_url,
      description:       description,
      color:             color,
      role:              role,
      tags:              tags,
      notes:             notes,
      isArchived:        false,
      customFieldValues: custom_field_values,
      createdAt:         now,
      updatedAt:         now,
    }, status: 201)

  else
    Solara::Response.err(res, 'Method not allowed', status: 405)
  end
end
