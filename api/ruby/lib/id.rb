# frozen_string_literal: true

# Unique ID generator for Ruby serverless functions.
# Generates IDs compatible with the existing data — same character set
# and approximate length as @paralleldrive/cuid2 used on the Node.js side.
# No external gem needed — SecureRandom is Ruby stdlib.

require 'securerandom'

module Solara
  module Id
    ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

    # Generate a CUID2-like ID: 24 lowercase alphanumeric characters.
    # Always starts with a letter (like CUID2) for SQL column safety.
    def self.generate
      # First char: always a letter
      first = ALPHABET[0, 26].chars.sample
      # Rest: random base36 chars from SecureRandom
      rest = SecureRandom.random_bytes(23).bytes.map { |b| ALPHABET[b % 36] }.join
      "#{first}#{rest}"
    end
  end
end
