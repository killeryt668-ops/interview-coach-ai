import os
import random
import time
from typing import Dict, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

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
    scores: Dict[str, int]  # confidence, clarity, structure, tone
    tips: List[str]
    improved_answer: str
    transcript: str
    emotions_detected: List[str]
    session_duration: float

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
    PLACEHOLDER: Convert spoken audio bytes into text.
    
    HOW TO IMPLEMENT THE REAL API LATER:
    1. OpenAI Whisper API:
       
       import openai
       # Save audio_bytes to a temp file because openai.Audio.transcribe requires a file-like object
       with open("temp.wav", "wb") as f:
           f.write(audio_bytes)
       
       audio_file = open("temp.wav", "rb")
       transcript = openai.Audio.transcribe("whisper-1", audio_file)
       return transcript["text"]

    2. Google Cloud Speech-to-Text:
       
       from google.cloud import speech
       client = speech.SpeechClient()
       audio = speech.RecognitionAudio(content=audio_bytes)
       config = speech.RecognitionConfig(
           encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16, # Match frontend format
           sample_rate_hertz=16000,
           language_code="en-US",
       )
       response = client.recognize(config=config, audio=audio)
       return " ".join([result.alternatives[0].transcript for result in response.results])
    """
    # Mocking STT transcripts
    # We will pick from a list of simulated interview phrases or statements
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
    PLACEHOLDER: Send the interview metrics and transcripts to an LLM to generate feedback.
    
    HOW TO IMPLEMENT THE REAL API LATER:
    1. Read the API key from environment variables:
       api_key = os.getenv("LLM_API_KEY")
       api_url = os.getenv("LLM_API_BASE_URL") or "https://api.openai.com/v1"
    
    2. Construct a prompt:
       prompt = f'''
       Analyze this job interview transcript and performance metrics:
       - Transcript: {transcript}
       - Emotion Breakdown: {emotion_summary}
       - Speech Metrics: {speech_metrics}
       
       Provide feedback containing:
       1. Overall score (0-100)
       2. Scores for Confidence, Clarity, Structure, Tone (0-100)
       3. Three bullet points of action-oriented coaching advice.
       4. An improved version of their answers, keeping their core background but polishing the structure (e.g., STAR method).
       
       Format the response strictly as a JSON object:
       {{
         "overall_score": 85,
         "scores": {{"confidence": 80, "clarity": 90, "structure": 82, "tone": 88}},
         "tips": ["tip 1", "tip 2", "tip 3"],
         "improved_answer": "polished version..."
       }}
       '''
       
    3. Make a request to the LLM (OpenAI, Gemini, or Anthropic):
       import openai
       client = openai.OpenAI(api_key=api_key, base_url=api_url)
       
       response = client.chat.completions.create(
           model="gpt-4-turbo", # or "gemini-1.5-flash", etc.
           response_format={"type": "json_object"},
           messages=[
               {"role": "system", "content": "You are a professional executive career coach."},
               {"role": "user", "content": prompt}
           ]
       )
       return json.loads(response.choices[0].message.content)
    """
    # Calculate a mock score based on the data points
    # Stressed emotions will lower confidence score slightly
    stressed_count = emotion_summary.get("stressed", 0)
    confident_count = emotion_summary.get("confident", 0)
    total_frames = sum(emotion_summary.values()) or 1
    
    stressed_ratio = stressed_count / total_frames
    confident_ratio = confident_count / total_frames
    
    confidence_score = int(80 + (confident_ratio * 20) - (stressed_ratio * 30))
    confidence_score = max(50, min(100, confidence_score))
    
    clarity_score = random.randint(75, 95)
    structure_score = random.randint(70, 92)
    tone_score = int(82 + (emotion_summary.get("happy", 0) / total_frames * 18))
    tone_score = max(60, min(100, tone_score))
    
    overall_score = int((confidence_score + clarity_score + structure_score + tone_score) / 4)
    
    # Generate generic yet relevant coaching tips based on performance
    tips = []
    if stressed_ratio > 0.15:
        tips.append("You showed signs of tension. Try practicing deep-breathing techniques to relax your posture and maintain steady eye contact.")
    else:
        tips.append("Excellent non-verbal posture. Your facial expressions conveyed openness and enthusiasm.")
        
    wpm = speech_metrics.get("average_wpm", 130)
    if wpm > 150:
        tips.append("Your speech rate was slightly fast (approx. 160 WPM). Slow down when delivering key technical terms to allow the interviewer to digest them.")
    elif wpm < 100:
        tips.append("Your speed was measured on the slower side. Try to build a bit more vocal energy and pacing to keep the conversation engaging.")
    else:
        tips.append("Your speaking speed was right in the sweet spot (120-140 WPM), making your answers easy to follow.")

    tips.append("Structure your examples using the STAR method: Situation, Task, Action, and Result, ensuring you highlight your personal contributions.")
    tips.append("When discussing weaknesses, follow up immediately with how you are proactively working to improve them.")

    improved_answer = (
        "Situation: In my last role, we faced a sudden drop in API throughput due to unoptimized database queries. "
        "Task: I was tasked with identifying the root bottleneck and implementing a fix within a 48-hour SLA. "
        "Action: I analyzed query execution plans, set up indexing on hot foreign keys, and added a caching layer using Redis for read-heavy queries. "
        "Result: This reduced search latency by 65% and successfully stabilized backend memory usage during peak traffic."
    )
    
    return {
        "overall_score": overall_score,
        "scores": {
            "confidence": confidence_score,
            "clarity": clarity_score,
            "structure": structure_score,
            "tone": tone_score
        },
        "tips": tips,
        "improved_answer": improved_answer
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
        session_duration=round(session_duration, 1)
    )

if __name__ == "__main__":
    import uvicorn
    # Run locally on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
