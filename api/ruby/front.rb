# frozen_string_literal: true

# /api/ruby/front — Front tracking (read-only)
#
# GET /api/ruby/front  — get current active front entry
#
# Write operations (POST/DELETE) remain in Next.js because they need
# PluralKit sync, friend notifications, and Next.js cache revalidation.
# Migrate them here in Phase R3 after porting those dependencies.

require_relative '_lib/turso'
require_relative '_lib/auth'
require_relative '_lib/response'
require 'json'

Handler = Proc.new do |req, res|
  system_id = Solara::Auth.system_id(req)
  unless system_id
    Solara::Response.unauthorized(res)
    next
  end

  unless req.request_method == 'GET'
    Solara::Response.err(res, 'Use /api/front for write operations', status: 405)
    next
  end

  rows = Solara::Turso.execute(
    <<~SQL,
      SELECT id, system_id, member_ids, started_at, ended_at, note, created_at
      FROM front_entries
      WHERE system_id = ? AND ended_at IS NULL
      LIMIT 1
    SQL
    [system_id]
  )

  if rows.empty?
    Solara::Response.ok(res, nil)
    next
  end

  entry = rows[0]
  member_ids = JSON.parse(entry['member_ids']) rescue []

  Solara::Response.ok(res, {
    id:        entry['id'],
    systemId:  entry['system_id'],
    memberIds: member_ids,
    startedAt: entry['started_at'],
    endedAt:   entry['ended_at'],
    note:      entry['note'],
    createdAt: entry['created_at'],
  })
end
