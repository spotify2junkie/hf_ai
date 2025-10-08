# Daily Paper Extractor - MVP

A simple web application to fetch and display academic papers from HuggingFace daily papers API.

## MVP Features

- 📅 Date picker for selecting specific dates
- 📚 Fetch papers from HuggingFace API
- 📊 Display papers in a clean table format
- 🔗 Show title, abstract, authors, and PDF URL

## Project Structure

```
├── frontend/          # React TypeScript application
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── App.tsx
│   └── package.json
├── backend/           # Node.js Express API
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.js
│   └── package.json
└── README.md
```

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## MVP Timeline
- Day 1: Project setup + HF API integration + basic React app
- Day 2: Results table + frontend-backend connection
- Day 3: Styling + deployment + basic testing