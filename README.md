# InterviewCoach AI

InterviewCoach AI is a job interview training platform that uses dynamic frontend analysis and FastAPI backend mocks/placeholders. The application helps users practice job interviews by capturing real-time camera frames and microphone audio, sending visual/vocal cues for coaching prompts, and compiling a comprehensive post-interview feedback report.

## Features
1. **Camera & Microphone Access**: Dynamic browser preview to align webcam and test device inputs.
2. **Real-time Visual Expression Mapping**: Frame capture uploads analyze emotions (e.g., neutral, stressed, happy, confident) and output live coach tips (e.g., "Try to smile more!", "Excellent eye contact").
3. **Pacing & Speech Checks**: Audio slices analyze speech speed metrics (Words Per Minute) and return pacing warnings.
4. **Coaching Scorecards**: Generates a detailed final feedback report detailing overall scores, sub-scores (Confidence, Clarity, Structure, Vocal Tone), actionable advice, and a polished STAR reference response.

---

## Folder Structure
```
interview-coach-ai/
├── backend/
│   ├── main.py              # FastAPI server containing API endpoints & mock placeholders
│   └── requirements.txt     # Python libraries needed
├── frontend/
│   ├── index.html           # HTML template imports Outfit & Plus Jakarta Sans
│   ├── src/
│   │   ├── main.jsx         # App mounting
│   │   ├── index.css        # Premium glassmorphic styling system
│   │   └── App.jsx          # Media recorders and webcam canvas capture loops
│   ├── package.json
│   └── vite.config.js
└── README.md                # Set up & implementation guide
```

---

## Getting Started

### 1. Set Up the Backend

1. Navigate to the `backend/` folder:
   ```bash
   cd backend
   ```
2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` folder:
   ```env
   EMOTION_API_KEY=your_emotion_api_key_here
   STT_API_KEY=your_stt_api_key_here
   LLM_API_KEY=your_llm_api_key_here
   LLM_API_BASE_URL=https://api.openai.com/v1
   ```
5. Start the FastAPI development server:
   ```bash
   python main.py
   # OR
   uvicorn main:app --reload
   ```
   The backend will be running on [http://localhost:8000](http://localhost:8000).

---

### 2. Set Up the Frontend

1. Navigate to the `frontend/` folder:
   ```bash
   cd frontend
   ```
2. Install node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to [http://localhost:5173](http://localhost:5173).

---

## How to Implement Real APIs Later

The backend contains clear placeholder functions with instructions on how to swap out mock results for production API clients.

### 1. Emotion & Body Language (`analyze_emotion` in `backend/main.py`)
- **Option A**: Use a cloud service such as **Google Cloud Vision API** or **Azure Face API** by sending the frame bytes to their endpoints.
- **Option B**: Run a local ML model using OpenCV and `deepface`. Example block is already documented in `main.py` comments.

### 2. Speech-To-Text (`transcribe_audio` in `backend/main.py`)
- **Option A (Whisper)**: Call OpenAI's `audio.transcriptions.create` API using the `openai` Python SDK.
- **Option B (Google Cloud)**: Use `google-cloud-speech` to send linear-pcm or webm audio blocks.

### 3. LLM Coaching & Polished Answers (`get_llm_feedback` in `backend/main.py`)
To generate high-quality critiques:
1. Load `LLM_API_KEY` and set up the OpenAI or Google GenAI client.
2. Formulate a structured prompt sending the `transcript`, `emotion_summary`, and `speech_metrics` (e.g., words per minute).
3. Request the LLM to output a JSON object matching this schema:
   ```json
   {
     "overall_score": 85,
     "scores": {
       "confidence": 80,
       "clarity": 90,
       "structure": 82,
       "tone": 88
     },
     "tips": ["Tip 1...", "Tip 2..."],
     "improved_answer": "Polished response using STAR..."
   }
   ```
   Detailed code comments for this request are available inside `backend/main.py`.
