#!/usr/bin/env node

/**
 * Build script for newspaper sites
 * Combines templates + content JSON → dist/ HTML files
 *
 * Usage: node build.js
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, 'templates');
const CONTENT_DIR = path.join(__dirname, 'content');
const STYLES_DIR = path.join(__dirname, 'styles');
const DIST_DIR = path.join(__dirname, 'dist');

// Newspapers to build
const NEWSPAPERS = [
  { template: 'chronicle.html', content: 'chronicle.json', output: 'index.html', style: 'chronicle.css' },
  { template: 'standard.html', content: 'standard.json', output: 'standard.html', style: 'standard.css' },
  { template: 'patriot.html', content: 'patriot.json', output: 'patriot.html', style: 'patriot.css' }
];

/**
 * Simple mustache-like template engine
 * Supports: {{variable}}, {{nested.variable}}, {{#array}}...{{/array}}, {{#array}}{{.}}{{/array}}
 */
function render(template, data) {
  // Handle sections (arrays and conditionals): {{#key}}...{{/key}}
  template = template.replace(/\{\{#(\S+?)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
    const value = getNestedValue(data, key);

    if (Array.isArray(value)) {
      return value.map(item => {
        if (typeof item === 'string' || typeof item === 'number') {
          // For simple arrays, replace {{.}} with the value
          return content.replace(/\{\{\.\}\}/g, item);
        } else {
          // For object arrays, recursively render
          return render(content, item);
        }
      }).join('\n');
    } else if (value) {
      // Truthy value, render content once
      return render(content, value);
    } else {
      // Falsy value, skip content
      return '';
    }
  });

  // Handle simple variables: {{variable}} or {{nested.variable}}
  template = template.replace(/\{\{(\S+?)\}\}/g, (match, key) => {
    if (key === '.') return match; // Skip {{.}} - handled in array context
    const value = getNestedValue(data, key);
    return value !== undefined ? value : match;
  });

  return template;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Inline CSS into HTML template (replaces stylesheet link with inline style)
 */
function inlineCSS(html, cssPath) {
  const css = fs.readFileSync(cssPath, 'utf8');
  // Replace the external stylesheet link with inline style
  return html.replace(
    /<link rel="stylesheet" href="[^"]*">/,
    `<style>\n${css}\n    </style>`
  );
}

/**
 * Build all newspapers
 */
function build() {
  console.log('Building newspaper sites...\n');

  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  for (const paper of NEWSPAPERS) {
    const templatePath = path.join(TEMPLATES_DIR, paper.template);
    const contentPath = path.join(CONTENT_DIR, paper.content);
    const stylePath = path.join(STYLES_DIR, paper.style);
    const outputPath = path.join(DIST_DIR, paper.output);

    try {
      // Read template and content
      let template = fs.readFileSync(templatePath, 'utf8');
      const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

      // Inline CSS
      template = inlineCSS(template, stylePath);

      // Render template with content
      const html = render(template, content);

      // Write output
      fs.writeFileSync(outputPath, html);

      console.log(`✓ ${paper.output} (${paper.template} + ${paper.content})`);
    } catch (error) {
      console.error(`✗ ${paper.output}: ${error.message}`);
    }
  }

  console.log(`\nOutput written to: ${DIST_DIR}/`);
}

// Run build
build();
