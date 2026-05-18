# frozen_string_literal: true

# Vercel Ruby Serverless Function — health check
# Proves the Ruby runtime is alive alongside Next.js.

require 'json'
require 'time'

Handler = Proc.new do |req, res|
  res.status = 200
  res['Content-Type'] = 'application/json'
  res.body = JSON.generate({
    ok: true,
    runtime: 'ruby',
    version: RUBY_VERSION,
    timestamp: Time.now.utc.iso8601
  })
end
