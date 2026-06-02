# Contributing

Thanks for helping improve Development Data Lab.

## Local Setup

```bash
npm install
npm run dev
```

Optional backend:

```bash
cd dashboard-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## Development Guidelines

- Keep the app useful in frontend-only mode.
- Add or update tests when changing data adapters, API endpoints, or major UI behavior.
- Keep public copy clear for learners. Put implementation details in code or maintainer docs.
- Do not add a public data source unless its endpoint, terms, and response shape are verified.
- Prefer normalized observation objects over one-off parsing inside components.

## Pull Request Checklist

- `npm run test`
- `npm run build`
- `cd dashboard-backend && pytest` when backend files change
- README updated when setup, sources, or public behavior changes
