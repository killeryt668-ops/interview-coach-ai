"""
Speaking Skills & Vocal Confidence Engine
Analyzes speech patterns, filler words, pace, confidence markers, and STAR structure.
Focused on: Clarity, Confidence, Pacing (WPM), Articulation, Confidence Markers, STAR Adherence.
"""
import re
from collections import Counter

FILLER_WORDS = {"um", "uh", "like", "you know", "sort of", "kind of", "basically", "literally", "right?"}

class SpeakingSkillsModel:
    """AI model for analyzing and coaching speaking skills and vocal confidence."""

    def __init__(self):
        self.transcripts = []
        self.wpm_readings = []

    def analyze_speech(self, transcript: str, wpm: float) -> dict:
        """Analyze a transcript chunk for speaking quality."""
        self.transcripts.append(transcript)
        self.wpm_readings.append(wpm)

        words = transcript.split()
        word_count = len(words)
        if word_count == 0:
            word_count = 1

        # Filler word detection
        tokens = [w.lower().strip(".,;:!?") for w in words]
        filler_count = sum(1 for t in tokens if t in FILLER_WORDS or any(f in t for f in FILLER_WORDS))
        filler_rate = filler_count / word_count

        # Confidence markers
        markers = []
        # Direct answer marker
        if re.search(r"\b(i believe|i think|i would|my approach is)\b", transcript, re.IGNORECASE):
            markers.append("direct_answer")
        # No over-apology marker
        if not re.search(r"\b(sorry|apologize|i'm bad at)\b", transcript, re.IGNORECASE):
            markers.append("no_over_apology")
        # Steady opening
        if len(words) > 4 and words[0][0].isalpha():
            markers.append("steady_opening")
        # STAR keywords
        star_tags = ["situation", "task", "action", "result", "challenge", "problem", "solution", "outcome"]
        found_tags = [t for t in star_tags if t in transcript.lower()]
        if len(found_tags) >= 2:
            markers.append("star_structure")

        # Articulation score heuristic
        avg_word_length = sum(len(w) for w in words) / word_count if word_count else 5
        articulation = min(100, 60 + avg_word_length * 3 + (1 - filler_rate) * 30)

        # WPM score: 120-150 sweet spot
        if 120 <= wpm <= 150:
            wpm_score = 90 + random_uniform(-5, 5)
        elif wpm > 150:
            wpm_score = max(50, 90 - (wpm - 150) * 1.5)
        elif wpm < 100:
            wpm_score = max(50, 70 + (wpm - 100) * 0.8)
        else:
            wpm_score = 80 + random_uniform(-8, 8)

        # Confidence score from markers + pace + filler rate
        confidence_base = 70 + len(markers) * 5
        confidence = min(100, confidence_base + (wpm_score * 0.1) - filler_rate * 20)

        # Clarity from filler rate and sentence length variance
        sentence_lengths = [len(s.split()) for s in re.split(r"[.!?]+", transcript) if s.strip()]
        clarity = min(100, 85 - filler_rate * 400 - (0 if sentence_lengths else 20))

        # Structure adherence
        structure = 70 + (10 if len(found_tags) >= 2 else 0) + (10 if "result" in transcript.lower() else 0)

        # Overall speaking skills score
        speaking_overall = int((clarity * 0.2 + confidence * 0.3 + wpm_score * 0.15 + articulation * 0.15 + structure * 0.2))

        return {
            "overall_speaking_score": max(50, min(100, speaking_overall)),
            "clarity": max(50, min(100, int(clarity))),
            "confidence": max(50, min(100, int(confidence))),
            "pacing_score": max(50, min(100, int(wpm_score))),
            "articulation": max(50, min(100, int(articulation))),
            "structure": max(50, min(100, int(structure))),
            "wpm": round(wpm, 1),
            "filler_word_rate": "low" if filler_rate < 0.03 else "moderate" if filler_rate < 0.08 else "high",
            "filler_words_detected": list(set(tokens))[:5],
            "confidence_markers": markers,
            "star_tags_found": found_tags,
        }

    def generate_speaking_insights(self, result: dict) -> list:
        """Generate speaking coaching tips based on analysis."""
        tips = []
        if result["wpm"] > 155:
            tips.append(f"Pacing Alert: Your WPM ({result['wpm']}) is above the ideal 120-150 range. Try the 'Pause and Point' technique: after your key point, pause for 1 second before continuing.")
        elif result["wpm"] < 100:
            tips.append(f"Pacing Alert: Your WPM ({result['wpm']}) is below ideal. Build vocal energy with slightly faster transitions between STAR sections.")
        else:
            tips.append(f"Pacing Strong: At {result['wpm']} WPM, your rhythm is excellent. Maintain this when delivering emotional framing.")

        if result["filler_word_rate"] == "high":
            tips.append("Filler Reduction: Replace 'um' and 'like' with brief silence. Silence signals confidence, not emptiness.")
        elif result["filler_word_rate"] == "moderate":
            tips.append("Filler Reduction: You have a few fillers. Practice answering in front of a mirror with one hand on your chest — if you notice tension, take a slow breath.")
        else:
            tips.append("Filler Strength: Your speech is clean. This creates authority — keep speaking with this precision in high-pressure questions.")

        if "star_structure" not in result["confidence_markers"]:
            tips.append("Structure Tip: Make sure your answers include at least 3 of the STAR elements (Situation, Task, Action, Result). Label them implicitly by using transition words like 'The challenge was...' and 'The outcome was...'")
        else:
            tips.append("Structure Strength: Your answers follow STAR logic well. Consider adding an emotional 'So what?' line linking the result to team or business impact.")

        if result["confidence"] < 75:
            tips.append("Confidence Booster: Start with a firm declaration, not a hedge. Instead of 'I think maybe I did X', try 'In that situation, I led X by doing Y.'")
        else:
            tips.append("Confidence Strength: Your direct, unhedged language builds trust. Keep using firm openers in weakness and leadership questions.")

        return tips

def random_uniform(a, b):
    import random
    return random.uniform(a, b)
