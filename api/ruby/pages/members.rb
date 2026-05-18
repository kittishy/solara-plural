# frozen_string_literal: true

# GET /pages/members — Server-rendered members list (Ruby SSR experiment)
#
# Returns full HTML page with member list. This is the Ruby SSR
# alternative to the React members page. Zero client-side JS needed
# for the read-only view.
#
# The React version at /members still works for editing. This page
# demonstrates the SSR migration path.

require_relative '../lib/turso'
require_relative '../lib/auth'
require_relative '../lib/response'
require_relative '../lib/template'
require 'json'

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

  Solara::Template.html_response(res, 'members/index',
    page_title: 'Members',
    members: members,
  )
end
