# frozen_string_literal: true

# /api/ruby/members/[id] — Per-member operations
#
# GET    /api/ruby/members/:id  — get a specific member
# PUT    /api/ruby/members/:id  — update a member
# DELETE /api/ruby/members/:id  — soft-delete (archive) a member

require_relative '../lib/turso'
require_relative '../lib/auth'
require_relative '../lib/response'
require_relative '../lib/request'
require 'json'

Handler = Proc.new do |req, res|
  system_id = Solara::Auth.system_id(req)
  unless system_id
    Solara::Response.unauthorized(res)
    next
  end

  member_id = req.query['id']
  unless member_id && !member_id.empty?
    Solara::Response.err(res, 'Missing member id', status: 400)
    next
  end

  case req.request_method
  when 'GET'
    rows = Solara::Turso.execute(
      'SELECT * FROM members WHERE id = ? AND system_id = ? LIMIT 1',
      [member_id, system_id]
    )

    if rows.empty?
      Solara::Response.not_found(res, 'Member not found')
      next
    end

    row = rows[0]
    tags = row['tags'] ? (JSON.parse(row['tags']) rescue []) : []

    Solara::Response.ok(res, {
      id:          row['id'],
      systemId:    row['system_id'],
      name:        row['name'],
      pronouns:    row['pronouns'],
      avatarUrl:   row['avatar_url'],
      description: row['description'],
      color:       row['color'],
      role:        row['role'],
      tags:        tags,
      notes:       row['notes'],
      isArchived:  row['is_archived'] == 1,
      createdAt:   row['created_at'],
      updatedAt:   row['updated_at'],
    })

  when 'PUT'
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

    now         = Time.now.utc.to_i
    pronouns    = Solara::Request.optional_string(body, 'pronouns')
    avatar_url  = Solara::Request.optional_string(body, 'avatarUrl')
    description = Solara::Request.optional_string(body, 'description')
    color       = Solara::Request.optional_string(body, 'color')
    role        = Solara::Request.optional_string(body, 'role')
    notes       = Solara::Request.optional_string(body, 'notes')
    tags_json   = tags.any? ? JSON.generate(tags) : nil

    result = Solara::Turso.execute(
      <<~SQL,
        UPDATE members SET
          name = ?, pronouns = ?, avatar_url = ?, description = ?,
          color = ?, role = ?, tags = ?, notes = ?, updated_at = ?
        WHERE id = ? AND system_id = ?
        RETURNING *
      SQL
      [name, pronouns, avatar_url, description, color, role, tags_json, notes, now, member_id, system_id]
    )

    if result.empty?
      Solara::Response.not_found(res, 'Member not found')
      next
    end

    row = result[0]
    Solara::Response.ok(res, {
      id:          row['id'],
      systemId:    row['system_id'],
      name:        row['name'],
      pronouns:    row['pronouns'],
      avatarUrl:   row['avatar_url'],
      description: row['description'],
      color:       row['color'],
      role:        row['role'],
      tags:        tags,
      notes:       row['notes'],
      isArchived:  row['is_archived'] == 1,
      updatedAt:   now,
    })

  when 'DELETE'
    # Soft delete: archive instead of destroying data
    now = Time.now.utc.to_i
    result = Solara::Turso.execute(
      'UPDATE members SET is_archived = 1, updated_at = ? WHERE id = ? AND system_id = ? RETURNING id',
      [now, member_id, system_id]
    )

    if result.empty?
      Solara::Response.not_found(res, 'Member not found')
      next
    end

    Solara::Response.ok(res, { archived: true, id: member_id })

  else
    Solara::Response.err(res, 'Method not allowed', status: 405)
  end
end
