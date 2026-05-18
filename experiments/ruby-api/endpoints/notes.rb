# frozen_string_literal: true

# experiments/ruby-api/endpoints/notes — Notes CRUD (collection endpoints)
#
# GET  /notes   — list all notes for current system
# POST /notes   — create a new note
#
# Per-note endpoints: endpoints/notes/[id].rb

require_relative '../lib/turso'
require_relative '../lib/auth'
require_relative '../lib/response'
require_relative '../lib/request'
require_relative '../lib/id'
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
        SELECT id, title, content, category, updated_at
        FROM system_notes
        WHERE system_id = ?
        ORDER BY updated_at DESC
      SQL
      [system_id]
    )

    notes = rows.map do |row|
      {
        id:        row['id'],
        title:     row['title'],
        content:   row['content'],
        category:  row['category'],
        updatedAt: row['updated_at'],
      }
    end

    Solara::Response.ok(res, notes)

  when 'POST'
    body = Solara::Request.require_json_object(req, res)
    next unless body

    content = Solara::Request.required_string(body, 'content')
    unless content
      Solara::Response.err(res, 'content is required')
      next
    end

    id       = Solara::Id.generate
    now      = Time.now.utc.to_i
    title    = Solara::Request.optional_string(body, 'title')
    member_id = Solara::Request.optional_string(body, 'memberId')
    category = Solara::Request.optional_string(body, 'category')
    is_private = body['isPrivate'] == true ? 1 : 0

    Solara::Turso.execute(
      <<~SQL,
        INSERT INTO system_notes
          (id, system_id, member_id, title, content, category, is_private, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      SQL
      [id, system_id, member_id, title, content, category, is_private, now, now]
    )

    Solara::Response.ok(res, {
      id:        id,
      systemId:  system_id,
      memberId:  member_id,
      title:     title,
      content:   content,
      category:  category,
      isPrivate: is_private == 1,
      createdAt: now,
      updatedAt: now,
    }, status: 201)

  else
    Solara::Response.err(res, 'Method not allowed', status: 405)
  end
end
