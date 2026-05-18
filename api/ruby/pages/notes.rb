# frozen_string_literal: true

# GET /api/ruby/pages/notes — Server-rendered notes list
#
# Returns full HTML page with notes list. Zero client-side JS.

require_relative '../_lib/turso'
require_relative '../_lib/auth'
require_relative '../_lib/response'
require_relative '../_lib/template'

Handler = Proc.new do |req, res|
  system_id = Solara::Auth.system_id(req)

  unless system_id
    res.status = 302
    res['Location'] = '/login'
    res.body = ''
    next
  end

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

  Solara::Template.html_response(res, 'notes/index',
    page_title: 'Notes',
    notes: notes,
  )
end
