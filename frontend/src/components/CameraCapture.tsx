import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Avatar,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  CameraAlt,
  Refresh,
  CheckCircle,
  Delete as DeleteIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';

interface CameraCaptureProps {
  token: string | null;
  username: string | null;
  photoUrl: string;
  onPhotoUpdated: (url: string) => void;
}

const CameraCapture = ({ token, username, photoUrl, onPhotoUpdated }: CameraCaptureProps) => {
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

  // Assign the stream to the video element after it's rendered in the DOM
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

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
    if (!capturedImage || !token) return;
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], `${username}.jpg`, { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/photo/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      onPhotoUpdated(response.data.photoUrl);
      setCapturedImage(null);
      setSuccess('Photo uploaded successfully!');
    } catch {
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [capturedImage, token, username, onPhotoUpdated]);

  const deletePhoto = useCallback(async () => {
    if (!token) return;
    setError(null);
    setSuccess(null);

    try {
      await axios.delete('/api/photo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      onPhotoUpdated('');
      setSuccess('Photo deleted.');
    } catch {
      setError('Failed to delete photo.');
    }
  }, [token, onPhotoUpdated]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Current Photo */}
      <Avatar
        src={photoUrl || undefined}
        sx={{ width: 120, height: 120, fontSize: 48, bgcolor: '#667eea' }}
      >
        {username ? username.charAt(0).toUpperCase() : '?'}
      </Avatar>

      {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ width: '100%' }}>{success}</Alert>}

      {/* Camera View */}
      {cameraActive && (
        <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '2px solid #667eea' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ display: 'block', width: 320, height: 240, objectFit: 'cover' }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}>
            <Button
              variant="contained"
              startIcon={<CameraAlt />}
              onClick={capturePhoto}
              sx={{ background: '#667eea', textTransform: 'none' }}
            >
              Capture
            </Button>
            <IconButton onClick={stopCamera} sx={{ color: '#e74c3c' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Captured Preview */}
      {capturedImage && (
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '2px solid #27ae60', display: 'inline-block' }}>
            <img src={capturedImage} alt="Captured" style={{ width: 320, height: 240, objectFit: 'cover', display: 'block' }} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}>
            <Button
              variant="contained"
              startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
              onClick={uploadPhoto}
              disabled={uploading}
              sx={{ background: '#27ae60', textTransform: 'none', '&:hover': { background: '#229954' } }}
            >
              {uploading ? 'Uploading...' : 'Save Photo'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={retake}
              disabled={uploading}
              sx={{ textTransform: 'none' }}
            >
              Retake
            </Button>
          </Box>
        </Box>
      )}

      {/* Action Buttons */}
      {!cameraActive && !capturedImage && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<CameraAlt />}
            onClick={startCamera}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', textTransform: 'none' }}
          >
            {photoUrl ? 'Retake Photo' : 'Take Photo'}
          </Button>
          {photoUrl && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={deletePhoto}
              sx={{ textTransform: 'none' }}
            >
              Remove
            </Button>
          )}
        </Box>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Box>
  );
};

export default CameraCapture;
