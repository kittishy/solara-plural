# frozen_string_literal: true

# /api/ruby/notes/[id] — Per-note operations
#
# GET    /api/ruby/notes/:id  — get a specific note
# PUT    /api/ruby/notes/:id  — update a note (title, content, category)
# DELETE /api/ruby/notes/:id  — delete a note

require_relative '../lib/turso'
require_relative '../lib/auth'
require_relative '../lib/response'
require_relative '../lib/request'

Handler = Proc.new do |req, res|
  system_id = Solara::Auth.system_id(req)
  unless system_id
    Solara::Response.unauthorized(res)
    next
  end

  # Vercel passes dynamic segment via req.query['id']
  note_id = req.query['id']
  unless note_id && !note_id.empty?
    Solara::Response.err(res, 'Missing note id', status: 400)
    next
  end

  case req.request_method
  when 'GET'
    rows = Solara::Turso.execute(
      'SELECT * FROM system_notes WHERE id = ? AND system_id = ? LIMIT 1',
      [note_id, system_id]
    )

    if rows.empty?
      Solara::Response.not_found(res, 'Note not found')
      next
    end

    row = rows[0]
    Solara::Response.ok(res, {
      id:        row['id'],
      systemId:  row['system_id'],
      memberId:  row['member_id'],
      title:     row['title'],
      content:   row['content'],
      category:  row['category'],
      isPrivate: row['is_private'] == 1,
      createdAt: row['created_at'],
      updatedAt: row['updated_at'],
    })

  when 'PUT'
    body = Solara::Request.require_json_object(req, res)
    next unless body

    content = Solara::Request.required_string(body, 'content')
    unless content
      Solara::Response.err(res, 'content is required')
      next
    end

    now = Time.now.utc.to_i
    title     = Solara::Request.optional_string(body, 'title')
    category  = Solara::Request.optional_string(body, 'category')
    member_id = Solara::Request.optional_string(body, 'memberId')
    is_private = body.key?('isPrivate') ? (body['isPrivate'] == true ? 1 : 0) : nil

    # Build SET clause dynamically to avoid overwriting fields not sent
    sets = ['content = ?', 'title = ?', 'category = ?', 'member_id = ?', 'updated_at = ?']
    params = [content, title, category, member_id, now]

    if is_private
      sets << 'is_private = ?'
      params << is_private
    end

    params += [note_id, system_id]

    result = Solara::Turso.execute(
      "UPDATE system_notes SET #{sets.join(', ')} WHERE id = ? AND system_id = ? RETURNING *",
      params
    )

    if result.empty?
      Solara::Response.not_found(res, 'Note not found')
      next
    end

    row = result[0]
    Solara::Response.ok(res, {
      id:        row['id'],
      systemId:  row['system_id'],
      memberId:  row['member_id'],
      title:     row['title'],
      content:   row['content'],
      category:  row['category'],
      isPrivate: row['is_private'] == 1,
      createdAt: row['created_at'],
      updatedAt: now,
    })

  when 'DELETE'
    result = Solara::Turso.execute(
      'DELETE FROM system_notes WHERE id = ? AND system_id = ? RETURNING id',
      [note_id, system_id]
    )

    if result.empty?
      Solara::Response.not_found(res, 'Note not found')
      next
    end

    Solara::Response.ok(res, { deleted: true, id: note_id })

  else
    Solara::Response.err(res, 'Method not allowed', status: 405)
  end
end
