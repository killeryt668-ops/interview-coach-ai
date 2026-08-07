"""
Emotional Intelligence Engine
Analyzes emotional behavior patterns from video frames, transcript tone, and session metrics.
Focused on: Self-Awareness, Self-Regulation, Social Awareness, Empathy, Relationship Management.
"""
import random
from collections import Counter

# Emotional categories mapped to EQ dimensions
EQ_MAP = {
    "happy": ("self_awareness", 0.75),
    "confident": ("self_regulation", 0.85),
    "neutral": ("self_awareness", 0.70),
    "stressed": ("self_regulation", 0.35),
    "thinking": ("self_awareness", 0.80),
    "hesitant": ("self_regulation", 0.40),
    "engaged": ("social_awareness", 0.85),
    "defensive": ("empathy", 0.25),
    "warm": ("empathy", 0.90),
    "curious": ("social_awareness", 0.85),
}

class EmotionalIntelligenceModel:
    """AI model for analyzing emotional intelligence during interview practice."""

    def __init__(self):
        self.emotion_history = []
        self.transcript_tone = []

    def analyze_emotions(self, emotion_list: list) -> dict:
        """Given a list of detected emotions during session, compute EQ scores."""
        counts = Counter(emotion_list)
        total = sum(counts.values()) or 1

        # Compute dimension scores based on emotional patterns
        self_awareness = min(100, 60 + counts.get("thinking", 0) * 10 + counts.get("confident", 0) * 8)
        self_regulation = min(100, 70 + counts.get("confident", 0) * 12 - counts.get("stressed", 0) * 15 - counts.get("hesitant", 0) * 8)
        social_awareness = min(100, 65 + counts.get("engaged", 0) * 10 + counts.get("curious", 0) * 8)
        empathy = min(100, 60 + counts.get("warm", 0) * 12 + counts.get("happy", 0) * 5)
        relationship_management = min(100, 68 + counts.get("confident", 0) * 6 + counts.get("warm", 0) * 8)

        # Overall EQ score weighted
        eq_overall = int(
            (self_awareness * 0.2) +
            (self_regulation * 0.25) +
            (social_awareness * 0.2) +
            (empathy * 0.15) +
            (relationship_management * 0.2)
        )

        return {
            "overall_eq": max(50, min(100, eq_overall)),
            "dimensions": {
                "self_awareness": max(50, min(100, self_awareness)),
                "self_regulation": max(50, min(100, self_regulation)),
                "social_awareness": max(50, min(100, social_awareness)),
                "empathy": max(50, min(100, empathy)),
                "relationship_management": max(50, min(100, relationship_management)),
            },
            "dominant_emotions": [k for k, v in counts.most_common(3) if v > 0],
        }

    def generate_eq_insights(self, eq_result: dict, transcript: str) -> list:
        """Generate emotional intelligence coaching tips based on analysis."""
        tips = []
        dims = eq_result["dimensions"]

        if dims["self_regulation"] < 75:
            tips.append("Self-Regulation Tip: When you feel stress rising, try the 'Ground and Breathe' technique: plant both feet, take a 4-second inhale, hold for 4, exhale for 6.")
        else:
            tips.append("Self-Regulation Strength: You recover well from pressure. Keep using brief pauses to reset your energy before answering.")

        if dims["social_awareness"] < 70:
            tips.append("Social Awareness Tip: Before answering, briefly acknowledge the interviewer's framing (e.g., 'That points to something I value...'). It builds immediate rapport.")
        else:
            tips.append("Social Awareness Strength: You read the room well. Continue using reflective phrases to show you are listening actively.")

        if dims["empathy"] < 70:
            tips.append("Empathy Tip: Include one sentence that validates the interviewer or the team: 'I can see why collaboration on this is critical.'")
        else:
            tips.append("Empathy Strength: Your warm tone makes answers feel personal. Maintain that warmth when describing challenges, not just wins.")

        if dims["self_awareness"] < 70:
            tips.append("Self-Awareness Tip: Notice if you over-explain when nervous. Use one headline sentence first, then expand only if asked.")
        else:
            tips.append("Self-Awareness Tip: Your clarity about your own strengths and growth areas is impressive — keep that honesty in weakness questions.")

        # Connection to speaking skills
        if "stressed" in eq_result.get("dominant_emotions", []):
            tips.append("Behavioral Link: Stress often raises WPM. If you feel tension, consciously drop your pace by 10% when delivering your STAR 'Result'.")

        return tips
