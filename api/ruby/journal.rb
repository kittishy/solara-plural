# frozen_string_literal: true

# /api/ruby/journal — Journal collection endpoints
#
# GET  /api/ruby/journal  — list journal entries for current system
# POST /api/ruby/journal  — create a new journal entry
#
# Per-entry endpoints: api/ruby/journal/[id].rb

require_relative '_lib/turso'
require_relative '_lib/auth'
require_relative '_lib/response'
require_relative '_lib/request'
require_relative '_lib/id'
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
        SELECT id, title, content, mood, fronting_member_ids, is_private, created_at, updated_at
        FROM system_journal
        WHERE system_id = ?
        ORDER BY created_at DESC
      SQL
      [system_id]
    )

    entries = rows.map do |row|
      fronting = row['fronting_member_ids'] ? (JSON.parse(row['fronting_member_ids']) rescue []) : []
      {
        id:                row['id'],
        title:             row['title'],
        content:           row['content'],
        mood:              row['mood'],
        frontingMemberIds: fronting,
        isPrivate:         row['is_private'] == 1,
        createdAt:         row['created_at'],
        updatedAt:         row['updated_at'],
      }
    end

    Solara::Response.ok(res, entries)

  when 'POST'
    body = Solara::Request.require_json_object(req, res)
    next unless body

    content = Solara::Request.required_string(body, 'content')
    unless content
      Solara::Response.err(res, 'content is required')
      next
    end

    title = Solara::Request.optional_string(body, 'title')
    mood  = body['mood'].is_a?(String) ? body['mood'] : nil

    raw_fronting = body['frontingMemberIds']
    fronting_ids = if raw_fronting.is_a?(Array) && raw_fronting.all? { |v| v.is_a?(String) }
      raw_fronting
    else
      []
    end
    fronting_json = fronting_ids.any? ? JSON.generate(fronting_ids) : nil

    is_private = body['isPrivate'] == true ? 1 : 0
    id         = Solara::Id.generate
    now        = Time.now.utc.to_i

    Solara::Turso.execute(
      <<~SQL,
        INSERT INTO system_journal
          (id, system_id, title, content, mood, fronting_member_ids, is_private, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      SQL
      [id, system_id, title, content, mood, fronting_json, is_private, now, now]
    )

    Solara::Response.ok(res, {
      entry: {
        id:                id,
        systemId:          system_id,
        title:             title,
        content:           content,
        mood:              mood,
        frontingMemberIds: fronting_ids,
        isPrivate:         is_private == 1,
        createdAt:         now,
        updatedAt:         now,
      }
    }, status: 201)

  else
    Solara::Response.err(res, 'Method not allowed', status: 405)
  end
end
