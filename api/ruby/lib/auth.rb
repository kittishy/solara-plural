# frozen_string_literal: true

# Lightweight session verification for Ruby serverless functions.
#
# NextAuth v5 uses a JWT-based session by default. The session token is
# stored in a cookie named `authjs.session-token` (or `__Secure-authjs.session-token`
# in production). This module verifies the token by calling the NextAuth
# session endpoint, so Ruby endpoints respect the same auth state.
#
# For endpoints that need high performance, we'll add direct JWT verification
# later. For now, delegating to the Next.js session endpoint is safe and
# consistent.

require 'net/http'
require 'json'
require 'uri'

module Solara
  module Auth
    # Extracts system_id from the current request by forwarding cookies
    # to the NextAuth session endpoint.
    #
    # Returns the system ID string, or nil if not authenticated.
    #
    def self.system_id(req)
      cookie = extract_cookie(req)
      return nil unless cookie

      # In Vercel, the session endpoint is on the same origin
      origin = extract_origin(req)
      return nil unless origin

      session = fetch_session(origin, cookie)
      session&.dig('user', 'id')
    end

    # Same as system_id but returns a hash with full user info.
    def self.session(req)
      cookie = extract_cookie(req)
      return nil unless cookie

      origin = extract_origin(req)
      return nil unless origin

      fetch_session(origin, cookie)
    end

    private

    def self.extract_cookie(req)
      req['Cookie'] || req.env&.dig('HTTP_COOKIE')
    end

    def self.extract_origin(req)
      host = req['Host'] || req.env&.dig('HTTP_HOST')
      return nil unless host

      scheme = req['X-Forwarded-Proto'] || req.env&.dig('HTTP_X_FORWARDED_PROTO') || 'https'
      "#{scheme}://#{host}"
    end

    def self.fetch_session(origin, cookie)
      uri = URI("#{origin}/api/auth/session")
      http_req = Net::HTTP::Get.new(uri)
      http_req['Cookie'] = cookie

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == 'https'
      http.open_timeout = 3
      http.read_timeout = 5

      response = http.request(http_req)
      return nil unless response.code == '200'

      data = JSON.parse(response.body)
      return nil if data.empty? || data['user'].nil?

      data
    rescue StandardError
      nil
    end
  end
end
