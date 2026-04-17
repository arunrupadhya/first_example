import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAssessmentStore } from '../store/assessmentStore';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  Chip,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Videocam,
  Stop,
  Replay,
  CheckCircle,
  Cancel,
  VerifiedUser,
  CameraAlt,
  QuestionAnswer
} from '@mui/icons-material';

interface VerificationResult {
  verificationId: number;
  candidateId: number;
  roundNumber: number;
  faceMatchResult: string;
  faceMatchConfidence: number;
  aiAnalysisDetails: string;
  message: string;
  overallResult?: string;
  overallConfidence?: number;
  videoMatchResult?: string;
  audioPresent?: boolean;
  assessmentId?: number;
  assessmentReady?: boolean;
}

const IdentityVerification = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [snapshotBlob, setSnapshotBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loading, setLoading] = useState(true);
  const [candidateName, setCandidateName] = useState('');
  const [question, setQuestion] = useState('');
  const [roundNumber, setRoundNumber] = useState(2);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const { triggerPreGenerate, setReady } = useAssessmentStore();

  // Fetch question and candidate info + trigger async pre-generation
  useEffect(() => {
    if (!id) return;
    const candidateId = parseInt(id, 10);
    axios.get(`/api/identity-verification/${id}/question`)
      .then(res => {
        setCandidateName(res.data.candidateName);
        setQuestion(res.data.question);
        setRoundNumber(res.data.roundNumber);
        if (!res.data.hasOriginalPhoto && !res.data.hasOriginalVideo) {
          setError('No original registration found. Please complete Round 1 first.');
        } else {
          // Pre-generate assessment questions in the background
          // By the time the candidate records & submits, questions will be ready
          triggerPreGenerate(candidateId);
        }
      })
      .catch(() => {
        setError('Could not load verification details. Please check the candidate ID.');
      })
      .finally(() => setLoading(false));
  }, [id, triggerPreGenerate]);

  const startCamera = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setRecordedBlob(null);
    setSnapshotBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      setError('Could not access camera/microphone. Please allow permissions.');
    }
  }, []);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  useEffect(() => {
    if (!loading && !error) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [loading, error, startCamera]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Capture a snapshot from the video stream for face comparison
  const captureSnapshot = useCallback((): Blob | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let blob: Blob | null = null;
    canvas.toBlob((b) => { blob = b; }, 'image/jpeg', 0.9);

    // toBlob is async, so we use a synchronous workaround
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    setDuration(0);

    // Capture snapshot at the start of recording for face comparison
    const snapshot = captureSnapshot();
    if (snapshot) {
      setSnapshotBlob(snapshot);
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(streamRef.current, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      stopCamera();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setRecording(true);

    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  }, [stopCamera, captureSnapshot]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const retake = useCallback(() => {
    setRecordedBlob(null);
    setSnapshotBlob(null);
    setError(null);
    setSuccess(null);
    setDuration(0);
    setVerificationResult(null);
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (recordedBlob && previewRef.current) {
      previewRef.current.src = URL.createObjectURL(recordedBlob);
    }
  }, [recordedBlob]);

  const submitVerification = useCallback(async () => {
    if (!recordedBlob || !snapshotBlob || !id) return;
    setUploading(true);
    setError(null);

    try {
      const videoFile = new File([recordedBlob], `verification-${id}-round-${roundNumber}.webm`, { type: 'video/webm' });
      const snapshotFile = new File([snapshotBlob], `snapshot-${id}-round-${roundNumber}.jpg`, { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('snapshot', snapshotFile);
      formData.append('question', question);
      formData.append('roundNumber', roundNumber.toString());
      formData.append('audioPresent', 'true');

      // Capture a second video frame snapshot for multi-factor verification
      if (canvasRef.current && recordedBlob) {
        // Use the existing snapshot as videoFrame too
        const videoFrameFile = new File([snapshotBlob], `videoframe-${id}-round-${roundNumber}.jpg`, { type: 'image/jpeg' });
        formData.append('videoFrame', videoFrameFile);
      }

      const response = await axios.post(`/api/identity-verification/${id}/verify`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setVerificationResult(response.data);

      const overallResult = response.data.overallResult || response.data.faceMatchResult;
      if (overallResult === 'MATCH') {
        setSuccess('Identity verified successfully! Multi-factor verification passed.');
        // Store assessment info in Zustand for cross-component access
        if (response.data.assessmentId) {
          setReady(parseInt(id, 10), response.data.assessmentId);
        }
      } else if (overallResult === 'MISMATCH') {
        setError('Identity verification FAILED. The person does NOT match the original registration.');
      } else {
        setError('Verification could not determine a match. Please try again with better lighting.');
      }
    } catch {
      setError('Failed to submit verification. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [recordedBlob, snapshotBlob, id, question, roundNumber, setReady]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'MATCH': return '#27ae60';
      case 'MISMATCH': return '#e74c3c';
      default: return '#f39c12';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <CircularProgress sx={{ color: 'white' }} aria-label="Loading verification" />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <AppBar position="static" sx={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <Toolbar>
          <VerifiedUser aria-hidden="true" sx={{ color: '#667eea', mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, color: '#2c3e50', fontWeight: 600 }}>
            Identity Verification — Round {roundNumber}
          </Typography>
          <Chip
            icon={<CameraAlt />}
            label="Photo + Video + Audio"
            color="primary"
            variant="outlined"
            size="small"
          />
        </Toolbar>
      </AppBar>

      {/* Hidden canvas for snapshot capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Candidate Info */}
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }}>
            Welcome, {candidateName}
          </Typography>
          <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
            This is an identity verification round. Your face will be compared with your original
            registration using AI to confirm your identity. Please ensure good lighting and face the camera directly.
          </Typography>
        </Paper>

        {/* Question Card */}
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3, border: '2px solid #667eea' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <QuestionAnswer sx={{ color: '#667eea' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
              Interview Question
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ color: '#34495e', fontStyle: 'italic', pl: 2, borderLeft: '4px solid #667eea' }}>
            "{question}"
          </Typography>
          <Typography variant="caption" sx={{ color: '#95a5a6', mt: 2, display: 'block' }}>
            Please answer this question while recording. Speak clearly and face the camera.
          </Typography>
        </Paper>

        {/* Video Recording Area */}
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#2c3e50' }}>
            Record Your Answer
          </Typography>

          {error && !verificationResult && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
          )}

          {/* Live Camera View */}
          {cameraActive && (
            <Box sx={{ mb: 2 }}>
              <video ref={videoRef} autoPlay playsInline muted
                aria-label="Camera preview for identity verification recording"
                style={{
                  width: '100%', maxWidth: 560, borderRadius: 12,
                  border: recording ? '3px solid #e74c3c' : '3px solid #667eea'
                }} />

              {recording && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
                  role="status" aria-live="polite">
                  <Box sx={{
                    width: 12, height: 12, borderRadius: '50%', backgroundColor: '#e74c3c',
                    animation: 'pulse 1s infinite',
                    '@keyframes pulse': { '0%': { opacity: 1 }, '50%': { opacity: 0.3 }, '100%': { opacity: 1 } }
                  }} />
                  <Typography variant="h6" sx={{ color: '#e74c3c', fontWeight: 700 }}>
                    REC {formatTime(duration)}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 2 }}>
                {!recording ? (
                  <Button variant="contained" size="large" onClick={startRecording}
                    startIcon={<Videocam />}
                    sx={{
                      background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                      px: 4, py: 1.5,
                      '&:hover': { background: 'linear-gradient(135deg, #c0392b 0%, #a93226 100%)' }
                    }}>
                    Start Recording
                  </Button>
                ) : (
                  <Button variant="contained" size="large" onClick={stopRecording}
                    startIcon={<Stop />}
                    sx={{
                      background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
                      px: 4, py: 1.5,
                      '&:hover': { background: 'linear-gradient(135deg, #1a252f 0%, #2c3e50 100%)' }
                    }}>
                    Stop Recording
                  </Button>
                )}
              </Box>
            </Box>
          )}

          {/* Recorded Video Preview */}
          {recordedBlob && !verificationResult && (
            <Box sx={{ mb: 2 }}>
              <video ref={previewRef} controls
                aria-label="Recorded verification video preview"
                style={{ width: '100%', maxWidth: 560, borderRadius: 12, border: '3px solid #27ae60' }} />
              <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button variant="outlined" onClick={retake} startIcon={<Replay />}>
                  Re-record
                </Button>
                <Button variant="contained" onClick={submitVerification} disabled={uploading}
                  startIcon={uploading ? <CircularProgress size={20} color="inherit" aria-label="Verifying identity" /> : <VerifiedUser />}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4292 100%)' }
                  }}>
                  {uploading ? 'Verifying...' : 'Submit for Verification'}
                </Button>
              </Box>
              {uploading && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ color: '#7f8c8d', mb: 1 }}>
                    Uploading video and running AI face comparison...
                  </Typography>
                  <LinearProgress />
                </Box>
              )}
            </Box>
          )}

          {/* Verification Result */}
          {verificationResult && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 3 }} />
              <Paper elevation={0} sx={{
                p: 3, borderRadius: 2,
                background: (verificationResult.overallResult || verificationResult.faceMatchResult) === 'MATCH' ? '#f0fff4' :
                  (verificationResult.overallResult || verificationResult.faceMatchResult) === 'MISMATCH' ? '#fff5f5' : '#fffbf0',
                border: `2px solid ${getResultColor(verificationResult.overallResult || verificationResult.faceMatchResult)}`
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                  {(verificationResult.overallResult || verificationResult.faceMatchResult) === 'MATCH' ? (
                    <CheckCircle sx={{ fontSize: 48, color: '#27ae60' }} />
                  ) : (
                    <Cancel sx={{ fontSize: 48, color: (verificationResult.overallResult || verificationResult.faceMatchResult) === 'MISMATCH' ? '#e74c3c' : '#f39c12' }} />
                  )}
                </Box>

                <Typography variant="h5" sx={{
                  fontWeight: 700, textAlign: 'center',
                  color: getResultColor(verificationResult.overallResult || verificationResult.faceMatchResult),
                  mb: 1
                }}>
                  {(verificationResult.overallResult || verificationResult.faceMatchResult) === 'MATCH'
                    ? 'Identity Verified — Multi-Factor Match'
                    : (verificationResult.overallResult || verificationResult.faceMatchResult) === 'MISMATCH'
                      ? 'Identity Mismatch — Verification Failed'
                      : 'Verification Inconclusive'}
                </Typography>

                {/* Multi-factor breakdown */}
                <Box sx={{ my: 2, p: 2, background: 'rgba(0,0,0,0.03)', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Verification Signals</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                      label={`Photo: ${verificationResult.faceMatchResult}`}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        color: 'white',
                        backgroundColor: verificationResult.faceMatchResult === 'MATCH' ? '#27ae60' : '#e74c3c'
                      }}
                    />
                    {verificationResult.videoMatchResult && (
                      <Chip
                        label={`Video: ${verificationResult.videoMatchResult}`}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          color: 'white',
                          backgroundColor: verificationResult.videoMatchResult === 'MATCH' ? '#27ae60' :
                            verificationResult.videoMatchResult === 'SKIPPED' ? '#95a5a6' : '#e74c3c'
                        }}
                      />
                    )}
                    <Chip
                      label={`Audio: ${verificationResult.audioPresent ? 'Detected' : 'Not Detected'}`}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        color: 'white',
                        backgroundColor: verificationResult.audioPresent ? '#27ae60' : '#f39c12'
                      }}
                    />
                  </Box>
                </Box>

                {(verificationResult.overallConfidence || verificationResult.faceMatchConfidence) > 0 && (
                  <Box sx={{ my: 2 }}>
                    <Typography variant="body2" sx={{ color: '#555', mb: 0.5 }}>
                      Overall Confidence Score
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={verificationResult.overallConfidence || verificationResult.faceMatchConfidence}
                        sx={{
                          flexGrow: 1, height: 10, borderRadius: 5,
                          '& .MuiLinearProgress-bar': {
                            background: `linear-gradient(90deg, ${getResultColor(verificationResult.overallResult || verificationResult.faceMatchResult)}, ${(verificationResult.overallConfidence || verificationResult.faceMatchConfidence) > 80 ? '#27ae60' : '#e74c3c'})`
                          }
                        }}
                      />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: getResultColor(verificationResult.overallResult || verificationResult.faceMatchResult) }}>
                        {(verificationResult.overallConfidence || verificationResult.faceMatchConfidence).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Paper elevation={0} sx={{ p: 2, mt: 2, background: 'rgba(0,0,0,0.03)', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2c3e50', mb: 0.5 }}>
                    AI Analysis Details
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#555', whiteSpace: 'pre-line' }}>
                    {verificationResult.aiAnalysisDetails}
                  </Typography>
                </Paper>

                <Typography variant="body2" sx={{ mt: 2, color: '#7f8c8d' }}>
                  {verificationResult.message}
                </Typography>

                {/* Assessment button when verification passes */}
                {verificationResult.assessmentReady && verificationResult.assessmentId && (
                  <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body1" sx={{ mb: 2, fontWeight: 500, color: '#2c3e50' }}>
                      Verification passed! You can now proceed to the technical assessment.
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => navigate(`/candidate-assessment/${verificationResult.assessmentId}`)}
                      sx={{
                        px: 4, py: 1.5,
                        background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #229954 0%, #27ae60 100%)' }
                      }}
                    >
                      Start Technical Assessment (45 min)
                    </Button>
                  </Box>
                )}
              </Paper>

              <Button variant="outlined" onClick={retake} startIcon={<Replay />} sx={{ mt: 3 }}>
                Verify Again
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default IdentityVerification;
