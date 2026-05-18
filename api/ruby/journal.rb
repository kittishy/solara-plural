# frozen_string_literal: true

# GET /api/ruby/journal — list journal entries for current system
#
# Ruby equivalent of app/api/journal/route.ts GET handler.

require_relative 'lib/turso'
require_relative 'lib/auth'
require_relative 'lib/response'
require 'json'

Handler = Proc.new do |req, res|
  system_id = Solara::Auth.system_id(req)
  unless system_id
    Solara::Response.unauthorized(res)
    next
  end

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
end
