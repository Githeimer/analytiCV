# analytiCV

AI-powered resume parser with ATS scoring and intelligent feedback using ChromaDB vector database.

## Installation

```bash
cd ai
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_lg
```

## Usage

### Command Line

```bash
cd ai
source .venv/bin/activate
python resume_parser.py <resume.pdf>
```

For JSON output:
```bash
python resume_parser.py <resume.pdf> --json
```

### API Server

Start the FastAPI server:
```bash
cd ai
source .venv/bin/activate
uvicorn api:app --reload
```

Server runs on `http://localhost:8000`

**Endpoints:**
- `POST /api/parse-resume` - Upload PDF and get analysis
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /health` - Health check

**Example using curl:**
```bash
curl -X POST "http://localhost:8000/api/parse-resume" \
  -F "file=@resume.pdf"
```

**Testing:**
Visit `http://localhost:8000/docs` for interactive testing interface.
