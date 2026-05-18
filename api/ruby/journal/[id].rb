# frozen_string_literal: true

# /api/ruby/journal/[id] — Per-entry operations
#
# GET    /api/ruby/journal/:id  — get a specific journal entry
# PUT    /api/ruby/journal/:id  — update a journal entry
# DELETE /api/ruby/journal/:id  — delete a journal entry

require_relative '../_lib/turso'
require_relative '../_lib/auth'
require_relative '../_lib/response'
require_relative '../_lib/request'
require 'json'

Handler = Proc.new do |req, res|
  system_id = Solara::Auth.system_id(req)
  unless system_id
    Solara::Response.unauthorized(res)
    next
  end

  entry_id = req.query['id']
  unless entry_id && !entry_id.empty?
    Solara::Response.err(res, 'Missing entry id', status: 400)
    next
  end

  case req.request_method
  when 'GET'
    rows = Solara::Turso.execute(
      'SELECT * FROM system_journal WHERE id = ? AND system_id = ? LIMIT 1',
      [entry_id, system_id]
    )

    if rows.empty?
      Solara::Response.not_found(res, 'Entry not found')
      next
    end

    row      = rows[0]
    fronting = row['fronting_member_ids'] ? (JSON.parse(row['fronting_member_ids']) rescue []) : []

    Solara::Response.ok(res, {
      entry: {
        id:                row['id'],
        systemId:          row['system_id'],
        title:             row['title'],
        content:           row['content'],
        mood:              row['mood'],
        frontingMemberIds: fronting,
        isPrivate:         row['is_private'] == 1,
        createdAt:         row['created_at'],
        updatedAt:         row['updated_at'],
      }
    })

  when 'PUT'
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

    now = Time.now.utc.to_i

    sets   = ['title = ?', 'content = ?', 'mood = ?', 'fronting_member_ids = ?', 'updated_at = ?']
    params = [title, content, mood, fronting_json, now]

    # Only update is_private if the client explicitly sent it
    if body.key?('isPrivate')
      sets   << 'is_private = ?'
      params << (body['isPrivate'] == true ? 1 : 0)
    end

    params += [entry_id, system_id]

    result = Solara::Turso.execute(
      "UPDATE system_journal SET #{sets.join(', ')} WHERE id = ? AND system_id = ? RETURNING *",
      params
    )

    if result.empty?
      Solara::Response.not_found(res, 'Entry not found')
      next
    end

    row = result[0]
    Solara::Response.ok(res, {
      entry: {
        id:                row['id'],
        systemId:          row['system_id'],
        title:             row['title'],
        content:           row['content'],
        mood:              row['mood'],
        frontingMemberIds: fronting_ids,
        isPrivate:         row['is_private'] == 1,
        createdAt:         row['created_at'],
        updatedAt:         now,
      }
    })

  when 'DELETE'
    result = Solara::Turso.execute(
      'DELETE FROM system_journal WHERE id = ? AND system_id = ? RETURNING id',
      [entry_id, system_id]
    )

    if result.empty?
      Solara::Response.not_found(res, 'Entry not found')
      next
    end

    Solara::Response.ok(res, { deleted: true, id: entry_id })

  else
    Solara::Response.err(res, 'Method not allowed', status: 405)
  end
end
