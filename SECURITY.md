# Security Policy

## Supported Versions

Security fixes are accepted for the current `main` branch.

## Reporting a Vulnerability

Please report security issues privately to the repository maintainer. Include:

- A clear description of the issue.
- Steps to reproduce it.
- Any affected endpoint, component, or configuration.
- Suggested remediation, if known.

## Security Notes

- The backend does not expose an arbitrary URL proxy.
- External data endpoints are allowlisted.
- Frontend-only mode avoids storing secrets in the browser.
- Do not commit API keys, tokens, or private datasets.
