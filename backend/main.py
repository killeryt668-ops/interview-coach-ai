import os
import random
import time
from typing import Dict, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import sys
# Insert absolute path of the parent directory so that ai_model package is found in all run conditions
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from ai_model.emotional_intelligence_engine import EmotionalIntelligenceModel
from ai_model.speaking_skills_engine import SpeakingSkillsModel

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="InterviewCoach AI Backend")

# Enable CORS so our React frontend can communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend URL (e.g., http://localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active sessions.
# In a production app, you would use a database (e.g., PostgreSQL, Redis) to persist session state.
sessions_db: Dict[str, dict] = {}

class StartSessionResponse(BaseModel):
    session_id: str
    status: str
    message: str

class FrameProcessResponse(BaseModel):
    emotion: str
    hint: str
    timestamp: float

class AudioProcessResponse(BaseModel):
    transcript: str
    hint: str
    words_per_minute: float

class ReportResponse(BaseModel):
    overall_score: int
    scores: Dict[str, int]
    tips: List[str]
    improved_answer: str
    transcript: str
    emotions_detected: List[str]
    session_duration: float
    emotional_insights: Optional[Dict[str, int]] = None
    speaking_insights: Optional[Dict] = None
    eq_overall: Optional[int] = None
    speaking_overall: Optional[int] = None

# ==========================================
# PLACEHOLDER FUNCTIONS FOR REAL APIS
# ==========================================

def analyze_emotion(frame_bytes: bytes) -> str:
    """
    PLACEHOLDER: Analyze facial expressions in the video frame to detect emotion.
    
    HOW TO IMPLEMENT THE REAL API LATER:
    1. You can use Google Cloud Vision API (Face Detection) or Microsoft Azure Face API.
    2. Alternatively, run a lightweight local ML model using OpenCV + deepface / Fer2013 model:
       
       from deepface import DeepFace
       import cv2
       import numpy as np

       # Decode bytes to OpenCV image
       nparr = np.frombuffer(frame_bytes, np.uint8)
       img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
       
       # Run inference
       predictions = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)
       dominant_emotion = predictions[0]['dominant_emotion']
       return dominant_emotion
    """
    # Mocking emotion analysis
    # Simulates returning one of these based on random chance
    emotions = ["happy", "neutral", "confident", "stressed", "thinking", "hesitant"]
    # Return weighted options to simulate realistic interview behavior
    return random.choices(emotions, weights=[0.2, 0.4, 0.2, 0.1, 0.05, 0.05])[0]


def transcribe_audio(audio_bytes: bytes) -> str:
    """
    Convert spoken audio bytes into text using OpenAI Whisper if configured,
    otherwise fallback to mock phrases.
    """
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if openai_api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_api_key)
            
            # Save audio_bytes to a unique temp file to avoid race conditions
            temp_filename = f"temp_{int(time.time())}_{random.randint(1000, 9999)}.wav"
            with open(temp_filename, "wb") as f:
                f.write(audio_bytes)
            
            with open(temp_filename, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )
            
            # Clean up the temp file
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
                
            return transcript.text
        except Exception as e:
            print(f"Error calling OpenAI Whisper: {e}")
            # Fall back to mock if Whisper fails
            
    # Mocking STT transcripts as fallback
    mock_phrases = [
        "I believe my biggest strength is my adaptability in high-pressure situations.",
        "In my previous project, I led a team of three developers to build a scalable pipeline.",
        "I am looking for a role where I can apply my Python backend skills and learn React.",
        "Sometimes I focus too much on details, but I am learning to prioritize milestones.",
        "I chose this career path because I enjoy solving logic puzzles and creating applications.",
        "I communicates effectively and work well in cross-functional team setups.",
    ]
    return random.choice(mock_phrases)


def get_llm_feedback(transcript: str, emotion_summary: dict, speech_metrics: dict) -> dict:
    """
    AI Coaching Model — Emotional Intelligence + Speaking Skills
    Uses EmotionalIntelligenceModel and SpeakingSkillsModel.
    """
    eq_model = EmotionalIntelligenceModel()
    speak_model = SpeakingSkillsModel()

    emotion_list = []
    for emo, count in emotion_summary.items():
        emotion_list.extend([emo] * count)
    eq_result = eq_model.analyze_emotions(emotion_list)
    eq_tips = eq_model.generate_eq_insights(eq_result, transcript)

    avg_wpm = speech_metrics.get("average_wpm", 130)
    speak_result = speak_model.analyze_speech(transcript, avg_wpm)
    speak_tips = speak_model.generate_speaking_insights(speak_result)

    confidence_score = max(50, min(100, int(speak_result["confidence"] + eq_result["dimensions"]["self_regulation"] * 0.3)))
    clarity_score = max(50, min(100, int(speak_result["clarity"])))
    structure_score = max(50, min(100, int(speak_result["structure"])))
    tone_score = max(50, min(100, int(eq_result["dimensions"]["empathy"] * 0.5 + speak_result["confidence"] * 0.5)))
    emotional_intelligence_score = eq_result["overall_eq"]
    speaking_skills_score = speak_result["overall_speaking_score"]

    overall_score = int(
        (confidence_score * 0.2) + (clarity_score * 0.15) + (structure_score * 0.15) +
        (tone_score * 0.1) + (emotional_intelligence_score * 0.2) + (speaking_skills_score * 0.2)
    )

    tips = eq_tips + speak_tips
    tips.append("Structure your examples using STAR: Situation, Task, Action, Result — with emotional framing in each section.")
    tips.append("When discussing weaknesses, immediately share how you are improving — it shows emotional maturity and growth mindset.")
    tips.append("Build rapport by briefly validating the interviewer (e.g., 'That highlights exactly why collaboration matters to me').")

    improved_answer = (
        "Situation: In my last role, we faced a sudden drop in API throughput due to unoptimized database queries affecting customer experience. "
        "Task: I was tasked with identifying the root bottleneck and fixing it within 48 hours while keeping the team aligned. "
        "Action: I analyzed execution plans, indexed hot foreign keys, added Redis caching, and held a brief stand-up to align priorities — showing empathy for workload. "
        "Result: Search latency dropped 65%, memory stabilized at peak traffic, and team collaboration improved.")

    return {
        "overall_score": overall_score,
        "scores": {
            "confidence": confidence_score,
            "clarity": clarity_score,
            "structure": structure_score,
            "tone": tone_score,
            "emotional_intelligence": emotional_intelligence_score,
            "speaking_skills": speaking_skills_score,
        },
        "emotional_insights": eq_result["dimensions"],
        "speaking_insights": {
            "wpm": avg_wpm,
            "filler_word_rate": speak_result.get("filler_word_rate", "low"),
            "articulation_score": speak_result.get("articulation", 80),
            "confidence_markers": speak_result.get("confidence_markers", []),
            "star_tags_found": speak_result.get("star_tags_found", []),
        },
        "tips": tips,
        "improved_answer": improved_answer,
        "eq_overall": eq_result["overall_eq"],
        "speaking_overall": speak_result["overall_speaking_score"],
    }


# ==========================================
# FASTAPI ENDPOINTS
# ==========================================

@app.post("/start-interview", response_model=StartSessionResponse)
def start_interview():
    """Initializes a new practice session."""
    session_id = f"sess_{int(time.time())}_{random.randint(1000, 9999)}"
    
    sessions_db[session_id] = {
        "start_time": time.time(),
        "emotions": [],
        "transcripts": [],
        "word_counts": [],
        "audio_durations": []
    }
    
    return StartSessionResponse(
        session_id=session_id,
        status="started",
        message="Interview session started. Adjust your camera and microphone."
    )


@app.post("/process-frame", response_model=FrameProcessResponse)
async def process_frame(
    session_id: str = Form(...),
    frame: UploadFile = File(...)
):
    """
    Accepts video frame uploads, performs visual emotion detection, 
    and returns a visual coaching hint.
    """
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Session not found")
        
    frame_bytes = await frame.read()
    emotion = analyze_emotion(frame_bytes)
    
    # Track emotion history in session database
    sessions_db[session_id]["emotions"].append(emotion)
    
    # Generate live visual hints
    hints_map = {
        "happy": "Great smile! Keep showing positive engagement.",
        "neutral": "Your facial expression is very calm. Try to smile occasionally to sound warm.",
        "confident": "Looking confident and collected. Keep it up!",
        "stressed": "Remember to take a breath, sit back, and relax your shoulders.",
        "thinking": "Good focus, you seem to be formulating a solid answer.",
        "hesitant": "Try to express your points firmly; speak with clear intent."
    }
    hint = hints_map.get(emotion, "Keep going, you're doing great!")
    
    return FrameProcessResponse(
        emotion=emotion,
        hint=hint,
        timestamp=time.time()
    )


@app.post("/process-audio", response_model=AudioProcessResponse)
async def process_audio(
    session_id: str = Form(...),
    audio: UploadFile = File(...),
    duration: float = Form(...) # Duration of the audio chunk in seconds
):
    """
    Accepts speech audio clips, processes transcription (mock STT),
    calculates words per minute (WPM), and returns speech coaching feedback.
    """
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Session not found")
        
    audio_bytes = await audio.read()
    transcript = transcribe_audio(audio_bytes)
    
    # Calculate word count & speaking rate
    word_count = len(transcript.split())
    # Estimate WPM for this chunk
    wpm = (word_count / duration) * 60 if duration > 0 else 130
    wpm = min(wpm, 300) # Cap at reasonable human speed limit
    
    # Track audio metrics
    sessions_db[session_id]["transcripts"].append(transcript)
    sessions_db[session_id]["word_counts"].append(word_count)
    sessions_db[session_id]["audio_durations"].append(duration)
    
    # Generate speech pace hint
    if wpm > 150:
        hint = "Speaking speed is high. Slow down slightly to emphasize your key points."
    elif wpm < 100 and word_count > 2:
        hint = "Speaking speed is low. Try to speak a bit more dynamically."
    else:
        hint = "Speaking speed is excellent! Maintain this clear pace."
        
    return AudioProcessResponse(
        transcript=transcript,
        hint=hint,
        words_per_minute=round(wpm, 1)
    )


@app.post("/get-report", response_model=ReportResponse)
def get_report(session_id: str = Form(...)):
    """
    Compiles all accumulated transcripts, emotions, and speech rate statistics,
    runs the LLM placeholder generator, and returns the final practice report.
    """
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions_db[session_id]
    
    # Summarize emotions
    emotion_list = session["emotions"]
    emotion_summary = {}
    for emo in emotion_list:
        emotion_summary[emo] = emotion_summary.get(emo, 0) + 1
        
    # Combine all transcripts
    full_transcript = " ".join(session["transcripts"])
    if not full_transcript:
        full_transcript = "No spoken responses were captured."
        
    # Calculate overall speech stats
    total_words = sum(session["word_counts"])
    total_duration = sum(session["audio_durations"])
    avg_wpm = (total_words / total_duration) * 60 if total_duration > 0 else 130
    
    speech_metrics = {
        "total_words": total_words,
        "total_duration_sec": total_duration,
        "average_wpm": round(avg_wpm, 1)
    }
    
    # Call the feedback generator (LLM placeholder)
    feedback = get_llm_feedback(full_transcript, emotion_summary, speech_metrics)
    
    # Complete response details
    session_duration = time.time() - session["start_time"]
    
    return ReportResponse(
        overall_score=feedback["overall_score"],
        scores=feedback["scores"],
        tips=feedback["tips"],
        improved_answer=feedback["improved_answer"],
        transcript=full_transcript,
        emotions_detected=list(emotion_summary.keys()) if emotion_summary else ["neutral"],
        session_duration=round(session_duration, 1),
        emotional_insights=feedback.get("emotional_insights"),
        speaking_insights=feedback.get("speaking_insights"),
        eq_overall=feedback.get("eq_overall"),
        speaking_overall=feedback.get("speaking_overall"),
    )

if __name__ == "__main__":
    import uvicorn
    # Run locally on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
