import {
  CSPValidator,
  DATA_PRIVACY_POLICY,
  InputValidator,
  PRIVACY_GUARANTEES,
  PrivacyGuard,
  SECURITY_DISCLOSURE_POLICY,
  XSSSanitizer,
} from './index';

describe('XSSSanitizer', () => {
  it('escapes text content and strips unsafe SVG/script content', () => {
    const sanitizer = new XSSSanitizer();
    const sanitizedText = sanitizer.sanitizeText(
      `<script>alert("x")</script> & "quoted" 'single' \`tick\``,
    );
    const sanitizedSvg = sanitizer.sanitizeSVG(
      `<svg onclick="alert(1)"><script>alert(1)</script><foreignObject>bad</foreignObject><a href="javascript:alert(1)">bad</a><text>safe</text></svg>`,
    );

    expect(sanitizedText).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &quot;quoted&quot; &#39;single&#39; &#96;tick&#96;',
    );
    expect(sanitizedSvg).not.toContain('<script');
    expect(sanitizedSvg).not.toContain('onclick=');
    expect(sanitizedSvg).not.toContain('foreignObject');
    expect(sanitizedSvg).not.toContain('javascript:');
    expect(sanitizedSvg).toContain('<text>safe</text>');
  });

  it('validates attributes and URL protocols safely', () => {
    const sanitizer = new XSSSanitizer();

    expect(sanitizer.validateAttribute('title', '<hello>')).toBe('&lt;hello&gt;');
    expect(sanitizer.validateAttribute('href', 'https://example.com/path')).toBe(
      'https://example.com/path',
    );
    expect(() => sanitizer.validateAttribute('onclick', 'alert(1)')).toThrow(
      'Event handler attributes are not allowed: "onclick".',
    );
    expect(() => sanitizer.sanitizeURL('javascript:alert(1)')).toThrow(
      'Unsafe URL protocol "javascript:".',
    );
  });
});

describe('CSPValidator', () => {
  it('validates strict CSP policies and reports compatibility warnings', () => {
    const validator = new CSPValidator();
    const validResult = validator.validateCSP(
      `default-src 'self'; style-src 'self' 'nonce-random'; script-src 'self'`,
    );
    const compatibleResult = validator.checkCompatibility(
      `default-src 'self'; style-src 'self'; script-src 'self'`,
    );

    expect(validator.getRequiredDirectives()).toEqual([
      `default-src 'self'`,
      `style-src 'self' 'nonce-{random}'`,
      `script-src 'self'`,
    ]);
    expect(validResult.valid).toBe(true);
    expect(validResult.missingDirectives).toEqual([]);
    expect(compatibleResult.compatible).toBe(true);
    expect(compatibleResult.warnings).toContain(
      'style-src is compatible but should prefer nonce-based inline styles for strict CSP deployments.',
    );
  });

  it('flags missing directives and unsafe CSP patterns', () => {
    const validator = new CSPValidator();
    const result = validator.validateCSP(
      `style-src 'unsafe-inline'; script-src 'self' 'unsafe-eval'`,
    );

    expect(result.valid).toBe(false);
    expect(result.missingDirectives).toContain('default-src');
    expect(result.usesUnsafeInline).toBe(true);
    expect(result.usesUnsafeEval).toBe(true);
  });
});

describe('InputValidator', () => {
  it('validates coordinates, node ids, themes, and translations', () => {
    const validator = new InputValidator();

    expect(
      validator.validateCoordinate({
        type: 'screen',
        x: 10,
        y: 20,
      }).coordinate,
    ).toEqual({
      type: 'screen',
      x: 10,
      y: 20,
    });
    expect(validator.validateNodeId('node_1:main-track')).toBe('node_1:main-track');
    expect(
      validator.validateTheme({
        colors: {
          track: {
            branch: '#059669',
            main: '#2563eb',
          },
          ui: {
            background: '#ffffff',
            text: '#0f172a',
          },
        },
        name: 'default',
      }).theme.name,
    ).toBe('default');
    expect(
      validator.validateTranslations({
        controls: {
          zoom: {
            in: 'Zoom in',
          },
        },
      }).translations,
    ).toEqual({
      controls: {
        zoom: {
          in: 'Zoom in',
        },
      },
    });
  });

  it('throws descriptive validation errors for invalid inputs', () => {
    const validator = new InputValidator();

    expect(() => validator.validateCoordinate({ type: 'screen', x: 'bad', y: 0 })).toThrow(
      'Screen coordinate must include a finite x value.',
    );
    expect(() => validator.validateNodeId('<bad>')).toThrow(
      'Node ID must start with an alphanumeric character and contain only letters, numbers, colons, underscores, or dashes.',
    );
    expect(() => validator.validateTheme({ name: 'bad', colors: {} })).toThrow(
      'Theme colors.track.main must be a valid color string.',
    );
    expect(() => validator.validateTranslations({ bad: [1, 2, 3] as never })).toThrow(
      'Translation value at root.bad must be a string or object.',
    );
  });
});

describe('PrivacyGuard', () => {
  it('documents privacy guarantees and rejects implicit storage enablement', () => {
    const guard = new PrivacyGuard();

    expect(guard.getGuarantees()).toEqual(PRIVACY_GUARANTEES);
    expect(guard.getPrivacyPolicy()).toEqual(DATA_PRIVACY_POLICY);
    expect(guard.getSecurityPolicy()).toEqual(SECURITY_DISCLOSURE_POLICY);
    expect(guard.assertNoNetworkRequests()).toBe(true);
    expect(guard.assertNoTelemetry()).toBe(true);
    expect(guard.assertStorageDisabled()).toBe(true);
    expect(() => guard.assertStorageDisabled({ enabled: true })).toThrow(
      'Persistent storage is disabled by default and must be explicitly enabled by the host application.',
    );
  });
});
