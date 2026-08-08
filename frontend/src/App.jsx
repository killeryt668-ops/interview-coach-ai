import React, { useState, useRef, useEffect } from 'react';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const QUESTIONS = [
  {
    id: 1,
    question: "Tell me about yourself and your background in software engineering.",
    keywords: ["experience", "engineering", "software", "python", "javascript", "developer", "build", "project"],
    details: "Mention your tech stack, recent projects, and overall passion for code."
  },
  {
    id: 2,
    question: "Can you describe a challenging technical problem you solved, and how you approached it?",
    keywords: ["solved", "problem", "bug", "database", "optimize", "debug", "approach", "scale"],
    details: "Explain the issue, the logic you used to solve it, and the final results."
  },
  {
    id: 3,
    question: "Why do you want to work with our team, and how do you handle collaborative projects?",
    keywords: ["team", "collaborate", "help", "learn", "communicate", "trust", "contribution", "share"],
    details: "Highlight your communication style, teamwork principles, and interest in this role."
  },
  {
    id: 4,
    question: "How do you prioritize milestones and handle deadline pressures under stressful conditions?",
    keywords: ["prioritize", "pressure", "deadline", "schedule", "plan", "milestone", "manage", "calendar"],
    details: "Describe how you break down tasks, communicate timelines, and stay calm."
  },
  {
    id: 5,
    question: "Can you share an example of a mistake you made, and what you learned from it?",
    keywords: ["mistake", "learned", "growth", "improvement", "feedback", "responsibility", "better", "fix"],
    details: "Own the mistake honestly, show how you fixed it, and explain how you grew from it."
  }
];

export default function App() {
  const [screen, setScreen] = useState('home'); // 'home', 'setup', 'practice', 'report'
  
  // Interactive mock interview states
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [currentQuestionTranscript, setCurrentQuestionTranscript] = useState('');
  const [evaluation, setEvaluation] = useState(null); // { rating: 'Good', feedback: '...' }
  const [countdown, setCountdown] = useState(null); // countdown seconds
  const [sessionId, setSessionId] = useState(null);
  
  // Media Stream States
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Live Feedback States
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [liveVisualHint, setLiveVisualHint] = useState('Align yourself in the frame and look into the camera.');
  const [liveSpeechHint, setLiveSpeechHint] = useState('Speak clearly at a moderate volume.');
  const [transcripts, setTranscripts] = useState([]);
  
  // Active session status & recorders
  const [isRecording, setIsRecording] = useState(false);
  const [report, setReport] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // References for Web APIs
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const canvasRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const audioIntervalRef = useRef(null);
  const evaluationIntervalRef = useRef(null);
  const speechRecognitionRef = useRef(null);

  // Always bind active media stream to videoRef whenever stream, screen, or cameraActive changes
  useEffect(() => {
    if (stream && videoRef.current && cameraActive) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, screen, cameraActive]);

  // Clean up media streams and loops on unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
      clearIntervals();
    };
  }, []);

  const stopAllMedia = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    stopSpeechRecognition();
  };

  const clearIntervals = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    if (evaluationIntervalRef.current) clearInterval(evaluationIntervalRef.current);
  };

  const [permissionDenied, setPermissionDenied] = useState(false);

  // Request camera and microphone access
  const requestMediaAccess = async () => {
    try {
      setErrorMsg('');
      setPermissionDenied(false);
      
      let userMedia;
      try {
        // Try getting both video and audio
        userMedia = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true
        });
      } catch (firstErr) {
        console.warn('Initial dual stream request failed, attempting fallbacks:', firstErr);
        
        if (firstErr.name === 'NotAllowedError' || firstErr.name === 'PermissionDeniedError') {
          setPermissionDenied(true);
          throw new Error('Permission denied by browser. Please grant access in your browser site settings.');
        }

        // Attempt video-only fallback
        try {
          userMedia = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (videoErr) {
          // Attempt audio-only fallback
          try {
            userMedia = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (audioErr) {
            throw firstErr;
          }
        }
      }
      
      setStream(userMedia);
      const hasVideo = userMedia.getVideoTracks().length > 0;
      const hasAudio = userMedia.getAudioTracks().length > 0;
      setCameraActive(hasVideo);
      setMicActive(hasAudio);
      
      // Bind video element
      if (videoRef.current && hasVideo) {
        videoRef.current.srcObject = userMedia;
      }
    } catch (err) {
      console.error('Error accessing camera/microphone:', err);
      setErrorMsg(err.message || 'Could not access camera or microphone. Please check browser permissions.');
    }
  };

  const handleStartSetup = async () => {
    setScreen('setup');
    // Allow React to mount the video element before requesting stream
    setTimeout(() => {
      requestMediaAccess();
    }, 100);
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraActive(videoTrack.enabled);
      }
    }
  };

  // Toggle Microphone
  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicActive(audioTrack.enabled);
      }
    }
  };

  // Start Practice in Demo/Simulation Mode (if webcam or mic hardware is unavailable/blocked)
  const startDemoMode = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/start-interview`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to connect to backend server.');
      
      const data = await response.json();
      setSessionId(data.session_id);
      setIsRecording(true);
      setScreen('practice');
      
      setCurrentQuestionIdx(0);
      setCurrentQuestionTranscript('');
      setEvaluation(null);
      setCountdown(null);
      speakText(QUESTIONS[0].question);
      startSpeechRecognition();
      
      // Simulated frame capture loop
      frameIntervalRef.current = setInterval(async () => {
        const dummyBlob = new Blob(["dummy_frame_content"], { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('session_id', data.session_id);
        formData.append('frame', dummyBlob, 'frame.jpg');

        try {
          const res = await fetch(`${API_BASE_URL}/process-frame`, { method: 'POST', body: formData });
          if (res.ok) {
            const resData = await res.json();
            setCurrentEmotion(resData.emotion);
            setLiveVisualHint(resData.hint);
          }
        } catch (e) {
          console.warn('Demo frame loop warning:', e);
        }
      }, 3000);

      // Simulated audio capture loop
      audioIntervalRef.current = setInterval(async () => {
        const dummyAudio = new Blob(["dummy_audio_content"], { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('session_id', data.session_id);
        formData.append('audio', dummyAudio, 'audio.webm');
        formData.append('duration', '4.0');

        try {
          const res = await fetch(`${API_BASE_URL}/process-audio`, { method: 'POST', body: formData });
          if (res.ok) {
            const resData = await res.json();
            if (resData.transcript) {
              setTranscripts(prev => [...prev, resData.transcript]);
              setCurrentQuestionTranscript(prev => prev ? prev + ' ' + resData.transcript : resData.transcript);
            }
            setLiveSpeechHint(resData.hint);
          }
        } catch (e) {
          console.warn('Demo audio loop warning:', e);
        }
      }, 4000);

    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to the backend server. Make sure FastAPI is running on port 8000.');
    }
  };

  // Start the actual practice session
  const startPractice = async () => {
    try {
      // 1. Call backend /start-interview
      const response = await fetch(`${API_BASE_URL}/start-interview`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to initialize session on backend.');
      }
      
      const data = await response.json();
      setSessionId(data.session_id);
      setIsRecording(true);
      setScreen('practice');
      
      setCurrentQuestionIdx(0);
      setCurrentQuestionTranscript('');
      setEvaluation(null);
      setCountdown(null);
      speakText(QUESTIONS[0].question);
      startSpeechRecognition();
      
      // Ensure local stream is properly assigned to the video element in practice view
      setTimeout(() => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
        }
        
        // Start loops
        startFrameCaptureLoop(data.session_id);
        startAudioCaptureLoop(data.session_id);
      }, 200);

    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to the backend server. Make sure FastAPI is running.');
      setScreen('setup');
    }
  };

  // Video Frame Capture Loop: Grabs a frame and POSTs to `/process-frame`
  const startFrameCaptureLoop = (sessId) => {
    // Check canvas setup
    if (!canvasRef.current) {
      // Dynamically create a canvas if not mounted
      canvasRef.current = document.createElement('canvas');
    }
    
    frameIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !cameraActive) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas size to match video feed
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas drawing to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const formData = new FormData();
        formData.append('session_id', sessId);
        formData.append('frame', blob, 'frame.jpg');

        try {
          const res = await fetch(`${API_BASE_URL}/process-frame`, {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            setCurrentEmotion(data.emotion);
            setLiveVisualHint(data.hint);
          }
        } catch (e) {
          console.warn('Error sending video frame:', e);
        }
      }, 'image/jpeg', 0.6); // Compress to 60% quality

    }, 3000); // Send frame every 3 seconds
  };

  // Audio Recording Loop: Uses MediaRecorder to capture and POST chunks to `/process-audio`
  const startAudioCaptureLoop = (sessId) => {
    if (!stream || !micActive) return;

    const chunkDuration = 4.0; // 4 seconds chunk
    let audioChunks = [];

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    recorder.onstop = async () => {
      if (audioChunks.length === 0) return;

      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      audioChunks = []; // clear cache

      const formData = new FormData();
      formData.append('session_id', sessId);
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('duration', chunkDuration.toString());

      try {
        const res = await fetch(`${API_BASE_URL}/process-audio`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          // Add transcription to real-time stream feed
          if (data.transcript && data.transcript.trim() !== '') {
            setTranscripts(prev => [...prev, data.transcript]);
            setCurrentQuestionTranscript(prev => prev ? prev + ' ' + data.transcript : data.transcript);
          }
          setLiveSpeechHint(data.hint);
        }
      } catch (e) {
        console.warn('Error sending audio chunk:', e);
      }

      // Re-trigger record if session is still active
      if (isRecording) {
        try {
          recorder.start();
        } catch (err) {
          console.warn('Recorder re-start failed', err);
        }
      }
    };

    // Trigger slice uploads periodically
    recorder.start();

    audioIntervalRef.current = setInterval(() => {
      if (recorder.state === 'recording') {
        recorder.stop(); // This triggers onstop, uploads the chunk, and restarts
      }
    }, chunkDuration * 1000);
  };

  // Finish practice, stop recorders, and get feedback report
  const endPractice = async () => {
    setIsRecording(false);
    clearIntervals();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    stopAllMedia();
    stopSpeechRecognition();
    setIsLoadingReport(true);
    setScreen('report');

    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('full_transcript', transcripts.join(' ')); // Send real transcript from browser speech recognition

      const res = await fetch(`${API_BASE_URL}/get-report`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve final coaching report.');
      }

      const data = await res.json();
      setReport(data);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to process final interview report.');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setCurrentQuestionTranscript(prev => {
            const cleanPrev = prev.trim();
            const cleanFinal = finalTranscript.trim();
            if (cleanPrev.endsWith(cleanFinal) || cleanPrev.includes(cleanFinal)) {
              return prev;
            }
            return prev ? prev + ' ' + cleanFinal : cleanFinal;
          });
          
          setTranscripts(prev => {
            const cleanFinal = finalTranscript.trim();
            if (prev.includes(cleanFinal)) return prev;
            return [...prev, cleanFinal];
          });
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };

      recognition.onend = () => {
        // Automatically restart if recording is still active
        if (isRecording) {
          try {
            recognition.start();
          } catch (e) {
            console.warn("Speech recognition auto-restart failed:", e);
          }
        }
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to initialize Speech Recognition:", err);
    }
  };

  const stopSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        console.warn("Speech recognition stop failed:", e);
      }
      speechRecognitionRef.current = null;
    }
  };

  const speakText = (text, callback) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      if (callback) {
        utterance.onend = callback;
      }
      window.speechSynthesis.speak(utterance);
    } else if (callback) {
      callback();
    }
  };

  const submitAndEvaluateAnswer = () => {
    const currentQuestion = QUESTIONS[currentQuestionIdx];
    // Combine final transcript with any remaining interim text
    const finalAnswer = (currentQuestionTranscript + ' ' + interimTranscript).trim();
    const answerText = finalAnswer.toLowerCase();
    
    // Check keyword matches
    const matchedKeywords = currentQuestion.keywords.filter(keyword => answerText.includes(keyword));
    const keywordCount = matchedKeywords.length;
    const wordCount = answerText.split(/\s+/).filter(Boolean).length;
    
    let rating = 'Needs Improvement';
    let feedback = '';
    
    if (wordCount < 5) {
      rating = 'Needs Improvement';
      feedback = "Your answer was very short. Try to elaborate using the STAR structure.";
    } else if (keywordCount >= 4) {
      rating = 'Excellent';
      feedback = `Great answer! You covered key concepts: ${matchedKeywords.slice(0, 3).join(', ')}.`;
    } else if (keywordCount >= 1) {
      rating = 'Good';
      feedback = `Good response. Try to mention more details like: ${currentQuestion.keywords.filter(k => !matchedKeywords.includes(k)).slice(0, 2).join(', ')}.`;
    } else {
      rating = 'Needs Improvement';
      feedback = `We suggest mentioning: ${currentQuestion.keywords.slice(0, 2).join(', ')}.`;
    }
    
    setEvaluation({ rating, feedback });
    
    // Speak feedback out loud
    const speakTextContent = rating === 'Needs Improvement'
      ? `Answer needs improvement. Let's try this question again. ${feedback}`
      : `${rating} answer. ${feedback} Moving to the next question shortly.`;
      
    speakText(speakTextContent);
    
    // Start 5-second countdown to next step
    let secondsLeft = 5;
    setCountdown(secondsLeft);
    
    if (evaluationIntervalRef.current) clearInterval(evaluationIntervalRef.current);
    
    evaluationIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      setCountdown(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(evaluationIntervalRef.current);
        setCountdown(null);
        setEvaluation(null);
        
        // Go to next question, retry, or end practice
        if (rating === 'Needs Improvement') {
          // Reset current question transcript and re-speak the question
          setCurrentQuestionTranscript('');
          setInterimTranscript('');
          speakText(currentQuestion.question);
        } else {
          // Advance or end
          if (currentQuestionIdx + 1 < QUESTIONS.length) {
            const nextIdx = currentQuestionIdx + 1;
            setCurrentQuestionIdx(nextIdx);
            setCurrentQuestionTranscript('');
            setInterimTranscript('');
            speakText(QUESTIONS[nextIdx].question);
          } else {
            endPractice();
          }
        }
      }
    }, 1000);
  };

  const handleRestart = () => {
    // Reset state variables
    setSessionId(null);
    setReport(null);
    setTranscripts([]);
    setCurrentEmotion('neutral');
    setLiveVisualHint('Align yourself in the frame and look into the camera.');
    setLiveSpeechHint('Speak clearly at a moderate volume.');
    setCurrentQuestionIdx(0);
    setCurrentQuestionTranscript('');
    setInterimTranscript('');
    setEvaluation(null);
    setCountdown(null);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setScreen('home');
  };

  return (
    <div className="container">
      {/* Universal Header */}
      <header className="header">
        <div className="logo" onClick={handleRestart} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">I</div>
          <span>InterviewCoach AI</span>
        </div>
        {screen !== 'home' && (
          <button className="btn btn-secondary" onClick={handleRestart}>
            🏠 Home
          </button>
        )}
      </header>

      {/* SCREEN 1: Home/Hero Panel */}
      {screen === 'home' && (
        <section className="hero-section">
          <div className="hero-badge">AI-Powered Training</div>
          <h1 className="hero-title">Master Your Next Tech Interview</h1>
          <p className="hero-desc">
            Practice job interviews in real-time. Our AI coach analyzes your facial expressions, speaking pace, and content structure to deliver immediate tips and detailed post-interview diagnostics.
          </p>
          
          <button className="btn btn-primary" onClick={handleStartSetup}>
            Start Mock Interview 🚀
          </button>

          <div className="features-grid">
            <div className="card feature-card">
              <div className="feature-icon">👤</div>
              <h3>Emotion & Body Language</h3>
              <p>Detect confidence, neutral, or stressed expressions dynamically as you speak.</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">🎙️</div>
              <h3>Pacing & Speech Metrics</h3>
              <p>Keep track of speaking rate to ensure you speak articulate, measured answers.</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">📝</div>
              <h3>STAR Feedback</h3>
              <p>Get personalized LLM-structured critiques and polished reference answers instantly.</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">💡</div>
              <h3>Emotional Intelligence</h3>
              <p>Analyze self-awareness, self-regulation, empathy, and social awareness in real-time.</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">🎙</div>
              <h3>Speaking & Confidence</h3>
              <p>Track WPM, filler words, confidence markers, and vocal energy for interview authority.</p>
            </div>
          </div>
        </section>
      )}

      {/* SCREEN 2: Device Connection & Preview Setup */}
      {screen === 'setup' && (
        <div className="card setup-panel">
          <h2 className="setup-title">Camera & Mic Check</h2>
          <p className="setup-desc">Verify your audio and video streams before starting the live practice.</p>

          {/* Permission Troubleshooting Box */}
          {permissionDenied && (
            <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              <h4 style={{ color: '#f87171', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem' }}>
                🔒 How to Enable Camera & Microphone Permissions:
              </h4>
              <ol style={{ marginLeft: '1.25rem', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.7' }}>
                <li>Look at your browser's address bar at the top (next to <code>http://localhost:5173</code>).</li>
                <li>Click the <strong>Tune / Settings / Padlock icon 🔒</strong> on the left side of the URL.</li>
                <li>Set both <strong>Camera</strong> and <strong>Microphone</strong> permissions to <strong>"Allow"</strong>.</li>
                <li>Click the <strong>"Retry Permission Request"</strong> button below.</li>
              </ol>
            </div>
          )}

          <div className="preview-box">
            {cameraActive ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="video-element" 
                style={{ transform: 'scaleX(-1)' }} // Mirror view for natural interaction
              />
            ) : (
              <div className="camera-off-placeholder">
                <span className="camera-off-icon">📹</span>
                <span>Camera feed is disabled or offline.</span>
              </div>
            )}

            {errorMsg && (
              <div style={{ position: 'absolute', bottom: '1rem', background: 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.85rem', width: '90%', textAlign: 'center' }}>
                ⚠️ {errorMsg}
              </div>
            )}
          </div>

          <div className="setup-controls-row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            {permissionDenied || !stream ? (
              <>
                <button className="btn btn-primary" onClick={requestMediaAccess}>
                  🔄 Retry Permission Request
                </button>
                <button className="btn btn-secondary" onClick={startDemoMode} style={{ borderColor: 'var(--secondary)' }}>
                  ⚡ Start in Demo Mode (No Camera)
                </button>
              </>
            ) : null}
            <button className="btn btn-secondary" onClick={toggleCamera}>
              {cameraActive ? '🎥 Turn Camera Off' : '🎥 Turn Camera On'}
            </button>
            <button className="btn btn-secondary" onClick={toggleMic}>
              {micActive ? '🎙️ Mute Mic' : '🎙️ Unmute Mic'}
            </button>
            <button 
              className="btn btn-primary" 
              onClick={startPractice}
              disabled={!stream}
            >
              Begin Session 🏁
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 3: Active Practice Session */}
      {screen === 'practice' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem' }}>Live Interview Session</h2>
              <span className="status-badge status-badge-active" style={{ marginTop: '0.5rem' }}>
                <span className="recording-dot"></span> Active AI Analysis
              </span>
            </div>
            <button className="btn btn-danger" onClick={endPractice}>
              ⏹️ Finish Practice
            </button>
          </div>

          {/* Interactive Question Panel */}
          <div className="card question-card" style={{ marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', borderLeft: '4px solid var(--primary)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Question {currentQuestionIdx + 1} of {QUESTIONS.length}
              </span>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }} onClick={() => speakText(QUESTIONS[currentQuestionIdx].question)}>
                🔊 Re-play Question
              </button>
            </div>
            <h3 style={{ fontSize: '1.35rem', fontFamily: 'var(--font-display)', marginBottom: '0.75rem', lineHeight: '1.4', color: 'var(--text-primary)' }}>
              {QUESTIONS[currentQuestionIdx].question}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>
              💡 Tip: {QUESTIONS[currentQuestionIdx].details}
            </p>
            
            {/* Live Transcript / Input */}
            <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Your Answer Transcript:</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {((currentQuestionTranscript + ' ' + interimTranscript).split(/\s+/).filter(Boolean)).length} words
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.95rem', minHeight: '2.5rem', color: (currentQuestionTranscript || interimTranscript) ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: (currentQuestionTranscript || interimTranscript) ? 'normal' : 'italic' }}>
                {currentQuestionTranscript}
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{interimTranscript}</span>
                {!(currentQuestionTranscript || interimTranscript) && "Start speaking into your mic to answer this question..."}
              </p>
            </div>

            {/* Evaluation & Feedback Overlay */}
            {evaluation && (
              <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: 'var(--radius-sm)', background: evaluation.rating === 'Excellent' ? 'rgba(16, 185, 129, 0.12)' : evaluation.rating === 'Good' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)', border: evaluation.rating === 'Excellent' ? '1px solid rgba(16, 185, 129, 0.3)' : evaluation.rating === 'Good' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: evaluation.rating === 'Excellent' ? '#10b981' : evaluation.rating === 'Good' ? '#f59e0b' : '#ef4444' }}>
                    Rating: {evaluation.rating}
                  </span>
                  {countdown !== null && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Next question in {countdown}s...
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {evaluation.feedback}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button className="btn btn-primary" onClick={submitAndEvaluateAnswer} disabled={evaluation !== null || !currentQuestionTranscript}>
                ✅ Submit Answer & Evaluate
              </button>
              <button className="btn btn-secondary" onClick={() => {
                if (currentQuestionIdx + 1 < QUESTIONS.length) {
                  const nextIdx = currentQuestionIdx + 1;
                  setCurrentQuestionIdx(nextIdx);
                  setCurrentQuestionTranscript('');
                  speakText(QUESTIONS[nextIdx].question);
                } else {
                  endPractice();
                }
              }} disabled={evaluation !== null}>
                ⏭️ Skip Question
              </button>
            </div>
          </div>

          <div className="session-grid">
            {/* Left: Video feed */}
            <div>
              <div className="video-wrapper">
                <div className="active-recording-badge">
                  <span className="recording-dot"></span> LIVE
                </div>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="video-element" 
                  style={{ transform: 'scaleX(-1)' }}
                />
                <div className="video-overlay-effect"></div>
              </div>
              
              <div className="session-controls">
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <span className="status-badge status-badge-active">
                    Emotion: {currentEmotion.toUpperCase()}
                  </span>
                  <span className="status-badge" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    Session ID: {sessionId?.slice(0, 10)}...
                  </span>
                </div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Analyzing frames every 3s
                </span>
              </div>
            </div>

            {/* Right: Feedback & Hints sidebar */}
            <div className="feedback-sidebar">
              <div className="card status-card">
                <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--secondary)' }}>Live Coach Prompts</h3>
                
                <div className="hint-bubble" style={{ borderColor: 'var(--primary)' }}>
                  <div className="hint-title">Visual Expression Analysis</div>
                  <div className="hint-text">{liveVisualHint}</div>
                </div>

                <div className="hint-bubble" style={{ borderColor: 'var(--secondary)', marginTop: '1rem' }}>
                  <div className="hint-title">Speech Articulation Analysis</div>
                  <div className="hint-text">{liveSpeechHint}</div>
                </div>
              </div>

              <div className="card live-feed-card">
                <h3 className="live-feed-title">
                  <span className="live-feed-dot"></span> Audio Transcript Stream
                </h3>
                <div className="transcript-stream">
                  {transcripts.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>
                      Start speaking. Transcripts will populate here as chunks upload.
                    </div>
                  ) : (
                    transcripts.map((text, idx) => (
                      <div key={idx} className="speech-bubble">
                        {text}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 4: Feedback Report Dashboard */}
      {screen === 'report' && (
        <div className="card">
          {isLoadingReport ? (
            <div style={{ textAlign: 'center', padding: '5rem 0' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'pulseGlow 1s linear infinite', margin: '0 auto 1.5rem' }}></div>
              <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Compiling AI Feedback</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Synthesizing speech rates, facial metrics, and formatting report template...</p>
            </div>
          ) : report ? (
            <div className="report-layout">
              {/* Score Showcase */}
              <div className="report-header">
                <div className="score-showcase">
                  <div className="radial-score-gauge" style={{ '--score': report.overall_score }}>
                    <span className="radial-score-value">{report.overall_score}</span>
                  </div>
                  <div className="score-details-label">
                    <h2 className="score-title">Interview Summary</h2>
                    <span className="score-subtitle">Session Duration: {report.session_duration}s • Overall Rating</span>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleRestart}>
                  Practice Again 🔄
                </button>
              </div>

              {/* Subscores */}
              <div className="subscores-grid">
                <div className="subscore-bar-card">
                  <div className="subscore-header">
                    <span>Confidence / Posture</span>
                    <span style={{ color: 'var(--primary)' }}>{report.scores.confidence}/100</span>
                  </div>
                  <div className="subscore-track">
                    <div className="subscore-fill" style={{ width: `${report.scores.confidence}%` }}></div>
                  </div>
                </div>

                <div className="subscore-bar-card">
                  <div className="subscore-header">
                    <span>Speech Clarity</span>
                    <span style={{ color: 'var(--secondary)' }}>{report.scores.clarity}/100</span>
                  </div>
                  <div className="subscore-track">
                    <div className="subscore-fill" style={{ width: `${report.scores.clarity}%` }}></div>
                  </div>
                </div>

                <div className="subscore-bar-card">
                  <div className="subscore-header">
                    <span>Content Structure</span>
                    <span style={{ color: 'var(--accent)' }}>{report.scores.structure}/100</span>
                  </div>
                  <div className="subscore-track">
                    <div className="subscore-fill" style={{ width: `${report.scores.structure}%` }}></div>
                  </div>
                </div>

                <div className="subscore-bar-card">
                  <div className="subscore-header">
                    <span>Vocal Tone Harmony</span>
                    <span style={{ color: '#10b981' }}>{report.scores.tone}/100</span>
                  </div>
                  <div className="subscore-track">
                    <div className="subscore-fill" style={{ width: `${report.scores.tone}%` }}></div>
                  </div>
                </div>

                <div className="subscore-bar-card">
                  <div className="subscore-header">
                    <span>Emotional Intelligence</span>
                    <span style={{ color: '#f59e0b' }}>{report.scores.emotional_intelligence || 75}/100</span>
                  </div>
                  <div className="subscore-track">
                    <div className="subscore-fill" style={{ width: `${report.scores.emotional_intelligence || 75}%`, background: 'linear-gradient(90deg, #f59e0b, #f97316)' }}></div>
                  </div>
                </div>

                <div className="subscore-bar-card">
                  <div className="subscore-header">
                    <span>Speaking Skills</span>
                    <span style={{ color: '#8b5cf6' }}>{report.scores.speaking_skills || 78}/100</span>
                  </div>
                  <div className="subscore-track">
                    <div className="subscore-fill" style={{ width: `${report.scores.speaking_skills || 78}%`, background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)' }}></div>
                  </div>
                </div>
                
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>🎙 Speaking Insights</h3>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="card" style={{ padding: '0.75rem', background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WPM</div>
                      <div style={{ fontWeight: 700, color: '#8b5cf6', fontSize: '1.1rem' }}>{report.speaking_insights?.wpm || 132}</div>
                    </div>
                    <div className="card" style={{ padding: '0.75rem', background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filler Rate</div>
                      <div style={{ fontWeight: 700, color: '#8b5cf6', fontSize: '1.1rem' }}>{report.speaking_insights?.filler_word_rate || 'low'}</div>
                    </div>
                    <div className="card" style={{ padding: '0.75rem', background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Articulation</div>
                      <div style={{ fontWeight: 700, color: '#8b5cf6', fontSize: '1.1rem' }}>{report.speaking_insights?.articulation_score || 82}</div>
                    </div>
                    <div className="card" style={{ padding: '0.75rem', background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>STAR Tags</div>
                      <div style={{ fontWeight: 700, color: '#8b5cf6', fontSize: '1.1rem' }}>{(report.speaking_insights?.star_tags_found || []).length}</div>
                    </div>
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)' }} />

              {/* Tips & Polished Answer */}
              <div className="report-section-grid">
                <div>
                  <h3 style={{ fontSize: '1.25rem' }}>💡 Actionable Coaching Advice</h3>
                  <div className="tips-list">
                    {report.tips.map((tip, idx) => (
                      <div key={idx} className="tip-item">
                        <div className="tip-bullet">✓</div>
                        <div className="tip-content">{tip}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.25rem' }}>✨ Polished STAR Model Answer</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: '1rem' }}>
                    Reference mapping based on your transcripts:
                  </p>
                  <div className="improved-box">
                    <div className="improved-text">{report.improved_answer}</div>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>💡 Emotional Intelligence Insights</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                    {report.emotional_insights && (
                      <>
                        <div className="card" style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Self-Awareness</div>
                          <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.1rem' }}>{report.emotional_insights.self_awareness || 75}</div>
                        </div>
                        <div className="card" style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Self-Regulation</div>
                          <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.1rem' }}>{report.emotional_insights.self_regulation || 78}</div>
                        </div>
                        <div className="card" style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Social Awareness</div>
                          <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.1rem' }}>{report.emotional_insights.social_awareness || 72}</div>
                        </div>
                        <div className="card" style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Empathy</div>
                          <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.1rem' }}>{report.emotional_insights.empathy || 80}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>🎙 Speaking Insights</h3>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="card" style={{ padding: '0.75rem', background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WPM</div>
                      <div style={{ fontWeight: 700, color: '#8b5cf6', fontSize: '1.1rem' }}>{report.speaking_insights?.wpm || 132}</div>
                    </div>
                    <div className="card" style={{ padding: '0.75rem', background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filler Rate</div>
                      <div style={{ fontWeight: 700, color: '#8b5cf6', fontSize: '1.1rem' }}>{report.speaking_insights?.filler_word_rate || 'low'}</div>
                    </div>
                    <div className="card" style={{ padding: '0.75rem', background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Articulation</div>
                      <div style={{ fontWeight: 700, color: '#8b5cf6', fontSize: '1.1rem' }}>{report.speaking_insights?.articulation_score || 82}</div>
                    </div>
                    <div className="card" style={{ padding: '0.75rem', background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>STAR Tags</div>
                      <div style={{ fontWeight: 700, color: '#8b5cf6', fontSize: '1.1rem' }}>{(report.speaking_insights?.star_tags_found || []).length}</div>
                    </div>
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)' }} />

              {/* Transcripts history details */}
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>🎙️ Full Transcript History</h3>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--card-border)', maxHeight: '200px', overflowY: 'auto' }}>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                    "{report.transcript}"
                  </p>
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Emotions observed:</span>
                  {report.emotions_detected.map((emo, i) => (
                    <span key={i} className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                      {emo}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--danger)' }}>
              ⚠️ {errorMsg || 'Failed to render report.'}
              <div style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-secondary" onClick={handleRestart}>Return Home</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
