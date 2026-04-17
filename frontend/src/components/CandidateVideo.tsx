import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  Videocam,
  Stop,
  Replay,
  CheckCircle,
  VideoCall
} from '@mui/icons-material';

const CandidateVideo = () => {
  const { id } = useParams<{ id: string }>();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setRecordedBlob(null);
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
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startCamera]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    setDuration(0);

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
  }, [stopCamera]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const retake = useCallback(() => {
    setRecordedBlob(null);
    setError(null);
    setSuccess(null);
    setDuration(0);
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (recordedBlob && previewRef.current) {
      previewRef.current.src = URL.createObjectURL(recordedBlob);
    }
  }, [recordedBlob]);

  const uploadVideo = useCallback(async () => {
    if (!recordedBlob || !id) return;
    setUploading(true);
    setError(null);

    try {
      const file = new File([recordedBlob], `candidate-${id}.webm`, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('file', file);

      await axios.post(`/api/candidate-registration/${id}/video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Video uploaded successfully! Your registration is now complete.');
    } catch {
      setError('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [recordedBlob, id]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <AppBar position="static" sx={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <Toolbar>
          <VideoCall aria-hidden="true" sx={{ color: '#667eea', mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, color: '#2c3e50', fontWeight: 600 }}>
            Video Introduction
          </Typography>
          <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
            Step 3 of 3
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: '#2c3e50' }}>
            Tell Me About Yourself
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: '#7f8c8d' }}>
            Click record and introduce yourself. Your video and audio will be captured. Take your time.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {/* Live Camera View */}
          {cameraActive && (
            <Box sx={{ mb: 2 }}>
              <video ref={videoRef} autoPlay playsInline muted
                aria-label="Camera preview for video recording"
                style={{
                  width: '100%', maxWidth: 480, borderRadius: 12,
                  border: recording ? '3px solid #e74c3c' : '3px solid #667eea'
                }} />

              {recording && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
                  role="status" aria-live="polite">
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#e74c3c',
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
          {recordedBlob && !success && (
            <Box sx={{ mb: 2 }}>
              <video ref={previewRef} controls
                aria-label="Recorded video preview"
                style={{ width: '100%', maxWidth: 480, borderRadius: 12, border: '3px solid #27ae60' }} />
              <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button variant="outlined" onClick={retake} startIcon={<Replay />}>
                  Re-record
                </Button>
                <Button variant="contained" onClick={uploadVideo} disabled={uploading}
                  startIcon={uploading ? <CircularProgress size={20} color="inherit" aria-label="Uploading video" /> : <CheckCircle />}
                  sx={{
                    background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #229954 0%, #27ae60 100%)' }
                  }}>
                  {uploading ? 'Uploading...' : 'Submit Video'}
                </Button>
              </Box>
            </Box>
          )}

          {/* Completion Message */}
          {success && (
            <Box sx={{ mt: 2, p: 3, background: '#f0fff4', borderRadius: 2 }}>
              <CheckCircle sx={{ fontSize: 48, color: '#27ae60', mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#27ae60' }}>
                Registration Complete!
              </Typography>
              <Typography variant="body2" sx={{ color: '#555', mt: 1 }}>
                Thank you for completing your registration. We will review your application and get back to you.
              </Typography>
              <Typography variant="body2" sx={{ color: '#667eea', mt: 2, fontWeight: 600 }}>
                For subsequent interview rounds, use the identity verification link sent to your email.
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default CandidateVideo;
