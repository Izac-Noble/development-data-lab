# Development Data Lab

Development Data Lab is an open-source learning dashboard for exploring public country development indicators. It helps learners inspect country profiles, indicator time series, source status, comparison views, and raw observations from public data APIs.

![Development Data Lab concept screenshot](docs/assets/development-data-lab-concept.png)

## Features

- Country dashboard with profile details, source-aware metrics, and a time-series chart.
- Indicator explorer for World Bank development indicators.
- East Africa comparison cards for Uganda, Kenya, Tanzania, and Rwanda.
- Raw observation table with source IDs and links.
- Source status page that separates live, optional, and inactive data sources.
- Frontend-only mode by default, with an optional FastAPI backend for typed proxy and enrichment endpoints.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173.

The frontend works without a backend. It fetches World Bank indicators directly and uses a small bundled country catalog for reliable learner workflows.

## Optional Backend

The FastAPI backend adds typed endpoints for country metadata, World Bank indicators, source status, and optional WHO data.

```bash
cd dashboard-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

In another terminal:

```bash
cp .env.example .env
npm run dev
```

The app will use `VITE_API_BASE_URL=http://localhost:8000` when the variable is set.

## Data Sources

All sources except REST Countries are keyless. The Source trace panel shows the live result of each request.

- World Bank World Development Indicators: population, GDP, health and education indicators (browser or backend).
- World Bank country API: live region, income group and capital, layered over the bundled catalog.
- UNESCO UIS data API: primary completion, out-of-school rate, youth literacy and education spending.
- Our World in Data: long-run life expectancy, child mortality and CO2 emissions per capita.
- WHO Global Health Observatory: backend only, because the WHO API does not allow browser (CORS) requests.
- Bundled country catalog: instant fallback metadata.

- REST Countries v5: languages, currency, area, population and borders. Needs a free API key, so it runs through the backend only (see below).

### REST Countries API key

REST Countries v1-v4 were shut down; v5 requires an API key. Keep the key on the backend: anything in a `VITE_*` variable is bundled into the public JavaScript.

```bash
cp dashboard-backend/.env.example dashboard-backend/.env
# then set REST_COUNTRIES_API_KEY=... in dashboard-backend/.env
```

Run the backend and point the frontend at it (`VITE_API_BASE_URL=http://localhost:8000` in the root `.env`). The Source trace shows REST Countries as Success once the key works.

## Scripts

```bash
npm run dev       # Start the Vite development server
npm run build     # Type-check and build production assets
npm run test      # Run frontend tests
npm run preview   # Preview the production build
```

Backend checks:

```bash
cd dashboard-backend
pytest
```

## Repository Name

The recommended repository slug is `development-data-lab`.

## Contributing

Contributions are welcome. Start with `CONTRIBUTING.md`, keep data-source claims verifiable, and include tests for data adapter or API behavior changes.

## License

MIT
