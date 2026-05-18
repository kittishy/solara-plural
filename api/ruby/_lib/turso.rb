# frozen_string_literal: true

# Turso/libSQL database helper for Ruby serverless functions.
# Uses the Turso HTTP API (Platform REST) so we avoid native extension
# issues in Vercel's Ruby runtime. The HTTP API works with any Turso
# database and only needs DATABASE_URL + DATABASE_AUTH_TOKEN.

require 'net/http'
require 'json'
require 'uri'

module Solara
  module Turso
    class Client
      def initialize(url: nil, auth_token: nil)
        @url = url || ENV.fetch('DATABASE_URL')
        @auth_token = auth_token || ENV['DATABASE_AUTH_TOKEN']

        # Convert libsql:// or ws:// URLs to HTTPS for the HTTP API
        @http_url = normalize_url(@url)
      end

      # Execute a single SQL statement. Returns an array of row hashes.
      #
      #   client.execute("SELECT * FROM systems WHERE id = ?", ["abc123"])
      #   # => [{"id" => "abc123", "name" => "Luna", ...}]
      #
      def execute(sql, params = [])
        body = {
          requests: [
            { type: 'execute', stmt: { sql: sql, args: serialize_params(params) } },
            { type: 'close' }
          ]
        }

        response = post('/v2/pipeline', body)
        results = response['results'] || []
        return [] if results.empty?

        result = results[0]
        raise "Turso query failed: #{result['error'] || result}" if result['type'] == 'error'

        rows_result = result.dig('response', 'result') || result['result'] || result
        return [] unless rows_result

        cols = rows_result['cols']&.map { |c| c['name'] } || []
        rows = rows_result['rows'] || []

        rows.map do |row|
          hash = {}
          cols.each_with_index do |col, i|
            hash[col] = extract_value(row[i])
          end
          hash
        end
      end

      # Execute multiple statements in a single batch.
      def batch(statements)
        requests = statements.map do |stmt|
          if stmt.is_a?(String)
            { type: 'execute', stmt: { sql: stmt, args: [] } }
          else
            { type: 'execute', stmt: { sql: stmt[:sql], args: serialize_params(stmt[:params] || []) } }
          end
        end
        requests << { type: 'close' }

        response = post('/v2/pipeline', { requests: requests })
        (response['results'] || []).map do |result|
          raise "Turso query failed: #{result['error'] || result}" if result['type'] == 'error'
          rows_result = result.dig('response', 'result') || result['result'] || result
          next [] unless rows_result

          cols = rows_result['cols']&.map { |c| c['name'] } || []
          rows = rows_result['rows'] || []
          rows.map do |row|
            hash = {}
            cols.each_with_index do |col, i|
              hash[col] = extract_value(row[i])
            end
            hash
          end
        end
      end

      private

      def normalize_url(url)
        url
          .sub(%r{^libsql://}, 'https://')
          .sub(%r{^ws://}, 'http://')
          .sub(%r{^wss://}, 'https://')
          .chomp('/')
      end

      def serialize_params(params)
        params.map do |p|
          case p
          when nil    then { type: 'null', value: nil }
          when Integer then { type: 'integer', value: p.to_s }
          when Float   then { type: 'float', value: p.to_s }
          when true, false then { type: 'integer', value: p ? '1' : '0' }
          else { type: 'text', value: p.to_s }
          end
        end
      end

      def extract_value(cell)
        return nil if cell.nil?
        return nil if cell['type'] == 'null'

        case cell['type']
        when 'integer' then cell['value'].to_i
        when 'float'   then cell['value'].to_f
        when 'text'    then cell['value']
        when 'blob'    then cell['value']
        else cell['value']
        end
      end

      def post(path, body)
        uri = URI("#{@http_url}#{path}")
        req = Net::HTTP::Post.new(uri)
        req['Content-Type'] = 'application/json'
        req['Authorization'] = "Bearer #{@auth_token}" if @auth_token

        req.body = JSON.generate(body)

        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = uri.scheme == 'https'
        http.open_timeout = 5
        http.read_timeout = 10

        response = http.request(req)
        unless response.is_a?(Net::HTTPSuccess)
          raise "Turso HTTP #{response.code}: #{response.body}"
        end

        JSON.parse(response.body)
      end
    end

    # Singleton client — initialized once per serverless function cold start.
    def self.client
      @client ||= Client.new
    end

    def self.execute(sql, params = [])
      client.execute(sql, params)
    end

    def self.batch(statements)
      client.batch(statements)
    end
  end
end
