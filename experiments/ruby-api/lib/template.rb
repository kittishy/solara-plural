# frozen_string_literal: true

# Lightweight ERB template renderer for Ruby SSR pages.
# Templates live in experiments/ruby-api/views/ and use the same CSS variables
# as the React frontend, so visual consistency is automatic.

require 'erb'
require 'cgi'

module Solara
  module Template
    VIEWS_DIR = File.expand_path('../../views', __FILE__)
    LAYOUTS_DIR = File.expand_path('../../views/layouts', __FILE__)

    # Render a view template inside the default layout.
    #
    #   Template.render('members/index', members: [...])
    #
    def self.render(view_name, layout: 'application', **locals)
      view_path = File.join(VIEWS_DIR, "#{view_name}.html.erb")
      raise "Template not found: #{view_path}" unless File.exist?(view_path)

      # Render inner content first
      content = render_erb(view_path, **locals)

      if layout
        layout_path = File.join(LAYOUTS_DIR, "#{layout}.html.erb")
        if File.exist?(layout_path)
          content = render_erb(layout_path, content: content, **locals)
        end
      end

      content
    end

    # Render a partial (no layout).
    def self.partial(name, **locals)
      path = File.join(VIEWS_DIR, "#{name}.html.erb")
      raise "Partial not found: #{path}" unless File.exist?(path)
      render_erb(path, **locals)
    end

    # Send an HTML response.
    def self.html_response(res, view_name, status: 200, **locals)
      html = render(view_name, **locals)
      res.status = status
      res['Content-Type'] = 'text/html; charset=utf-8'
      res['Cache-Control'] = 'private, no-cache'
      res.body = html
    end

    def self.h(value)
      CGI.escapeHTML(value.to_s)
    end

    private

    def self.render_erb(path, **locals)
      template = File.read(path)
      binding_obj = create_binding(**locals)
      ERB.new(template, trim_mode: '-').result(binding_obj)
    end

    def self.create_binding(**locals)
      b = binding
      b.local_variable_set(:h, method(:h))
      locals.each do |key, value|
        b.local_variable_set(key, value)
      end
      b
    end
  end
end
