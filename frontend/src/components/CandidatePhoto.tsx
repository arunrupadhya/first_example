import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  CameraAlt,
  Refresh,
  CheckCircle,
  PhotoCamera
} from '@mui/icons-material';

const CandidatePhoto = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      setError('Could not access camera. Please allow camera permissions.');
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
    };
  }, [startCamera]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setError(null);
    setSuccess(null);
    startCamera();
  }, [startCamera]);

  const uploadPhoto = useCallback(async () => {
    if (!capturedImage || !id) return;
    setUploading(true);
    setError(null);

    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], `candidate-${id}.jpg`, { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);

      await axios.post(`/api/candidate-registration/${id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Photo uploaded successfully!');
      setTimeout(() => navigate(`/candidate-video/${id}`), 1500);
    } catch {
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [capturedImage, id, navigate]);

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <AppBar position="static" sx={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <Toolbar>
          <PhotoCamera sx={{ color: '#667eea', mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, color: '#2c3e50', fontWeight: 600 }}>
            Capture Your Photo
          </Typography>
          <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
            Step 2 of 3
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: '#2c3e50' }}>
            Take Your Photo
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: '#7f8c8d' }}>
            Please look directly at the camera and ensure good lighting.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {cameraActive && (
            <Box sx={{ mb: 2 }}>
              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: '100%', maxWidth: 480, borderRadius: 12, border: '3px solid #667eea' }} />
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" size="large" onClick={capturePhoto}
                  startIcon={<CameraAlt />}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    px: 4, py: 1.5,
                    '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4192 100%)' }
                  }}>
                  Capture Photo
                </Button>
              </Box>
            </Box>
          )}

          {capturedImage && !success && (
            <Box sx={{ mb: 2 }}>
              <img src={capturedImage} alt="Captured"
                style={{ width: '100%', maxWidth: 480, borderRadius: 12, border: '3px solid #27ae60' }} />
              <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button variant="outlined" onClick={retake} startIcon={<Refresh />}>
                  Retake
                </Button>
                <Button variant="contained" onClick={uploadPhoto} disabled={uploading}
                  startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
                  sx={{
                    background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #229954 0%, #27ae60 100%)' }
                  }}>
                  {uploading ? 'Uploading...' : 'Submit Photo'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default CandidatePhoto;
