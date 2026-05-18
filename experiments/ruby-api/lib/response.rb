# frozen_string_literal: true

# Consistent JSON response helpers for Ruby serverless functions.
# Mirrors the patterns in lib/api/helpers.ts so both runtimes
# return the same { success, data/error } shape.

require 'json'

module Solara
  module Response
    def self.ok(res, data, status: 200)
      res.status = status
      res['Content-Type'] = 'application/json'
      res['Cache-Control'] = 'private, no-cache'
      res.body = JSON.generate({ success: true, data: data })
    end

    def self.err(res, message, status: 400)
      res.status = status
      res['Content-Type'] = 'application/json'
      res['Cache-Control'] = 'private, no-cache'
      res.body = JSON.generate({ success: false, error: message })
    end

    def self.not_found(res, message = 'Not found')
      err(res, message, status: 404)
    end

    def self.unauthorized(res)
      err(res, 'Unauthorized', status: 401)
    end

    def self.forbidden(res)
      err(res, 'Forbidden', status: 403)
    end
  end
end
