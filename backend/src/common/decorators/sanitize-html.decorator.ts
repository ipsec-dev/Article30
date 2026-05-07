import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

const BIDI_CONTROL_CHARS = /[\u202A-\u202E\u2066-\u2069]/g;

function sanitizeHtmlDecorator() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const stripped = value.replaceAll(BIDI_CONTROL_CHARS, '');
    return sanitizeHtml(stripped, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'discard',
    }).trim();
  });
}

// Decorator factories follow PascalCase by class-transformer convention.
export { sanitizeHtmlDecorator as SanitizeHtml };
