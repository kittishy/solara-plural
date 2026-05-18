# frozen_string_literal: true

# Request helpers for Ruby serverless functions.
# Parses JSON bodies, reads query params, and routes by HTTP method.

require 'json'

module Solara
  module Request
    # Parse the JSON request body. Returns a hash or nil on failure.
    def self.json_body(req)
      body = req.body.is_a?(IO) ? req.body.read : req.body.to_s
      return nil if body.nil? || body.empty?
      JSON.parse(body)
    rescue JSON::ParserError
      nil
    end

    # Parse a JSON body and return a hash. Writes error response if invalid.
    # Returns nil + writes error if body is missing or not an object.
    def self.require_json_object(req, res)
      body = json_body(req)
      if body.nil?
        Solara::Response.err(res, 'Invalid or missing JSON body', status: 400)
        return nil
      end
      unless body.is_a?(Hash)
        Solara::Response.err(res, 'JSON body must be an object', status: 400)
        return nil
      end
      body
    end

    # Extract a path segment from the request URL.
    # e.g. for /api/ruby/notes/abc123, segment(-1) returns "abc123"
    def self.path_segment(req, index)
      parts = req.path.split('/').reject(&:empty?)
      index < 0 ? parts[parts.length + index] : parts[index]
    end

    # Read a string from a hash, return nil if blank.
    def self.optional_string(hash, key)
      val = hash[key.to_s] || hash[key.to_sym]
      return nil unless val.is_a?(String)
      val.strip.empty? ? nil : val.strip
    end

    # Read a required string. Returns nil if blank.
    def self.required_string(hash, key)
      val = optional_string(hash, key)
      val&.empty? ? nil : val
    end
  end
end
