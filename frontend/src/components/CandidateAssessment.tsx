import { useState, useEffect, useRef, useCallback } from 'react';
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
  Toolbar,
  Chip,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Timer,
  Send,
  Quiz,
  Code,
  CheckCircle,
  Warning
} from '@mui/icons-material';

interface ObjectiveQuestion {
  id: number;
  question: string;
  options: Record<string, string>;
  difficulty: string;
  topic: string;
}

interface CodingQuestion {
  id: number;
  question: string;
  exampleInput: string;
  exampleOutput: string;
  difficulty: string;
  topic: string;
}

interface AssessmentData {
  assessmentId: number;
  candidateId: number;
  candidateName: string;
  status: string;
  timeLimitMinutes: number;
  startedAt: string;
  questions: {
    objective: ObjectiveQuestion[];
    coding: CodingQuestion[];
  };
}

const CandidateAssessment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [result, setResult] = useState<{ totalScore: number; maxScore: number } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitRef = useRef(false);

  // Fetch assessment
  useEffect(() => {
    if (!id) return;
    axios.get(`/api/assessment/${id}`)
      .then(res => {
        const total = (res.data.questions?.objective?.length || 0) + (res.data.questions?.coding?.length || 0);
        if (total === 0) {
          setError('Assessment questions are still being prepared. Please refresh this page in a few moments.');
        }
        setAssessment(res.data);
        if (res.data.status === 'EVALUATED' || res.data.status === 'SUBMITTED') {
          setSubmitted(true);
          return;
        }
        // Calculate remaining time
        const startedAt = new Date(res.data.startedAt).getTime();
        const limitMs = res.data.timeLimitMinutes * 60 * 1000;
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, Math.floor((limitMs - elapsed) / 1000));
        setTimeLeft(remaining);
      })
      .catch(() => setError('Failed to load assessment.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || submitted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (!autoSubmitRef.current) {
            autoSubmitRef.current = true;
            handleAutoSubmit();
          }
          return 0;
        }
        if (prev === 300) setShowTimeWarning(true); // 5 min warning
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, submitted]);

  const handleAutoSubmit = useCallback(() => {
    if (submitted || submitting) return;
    submitAnswers();
  }, [submitted, submitting, answers, id]);

  const submitAnswers = async () => {
    if (!id || submitting) return;
    setSubmitting(true);
    try {
      const response = await axios.post(`/api/assessment/${id}/submit`, { answers });
      setSubmitted(true);
      setResult({
        totalScore: response.data.totalScore || 0,
        maxScore: response.data.maxScore || 100
      });
    } catch {
      setError('Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  const handleObjectiveAnswer = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId.toString()]: answer }));
  };

  const handleCodingAnswer = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId.toString()]: answer }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = assessment
    ? (assessment.questions?.objective?.length || 0) + (assessment.questions?.coding?.length || 0)
    : 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  if (error && !assessment) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (submitted) {
    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 80, color: '#27ae60', mb: 2 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
              Assessment Submitted
            </Typography>
            {result && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ color: '#667eea', fontWeight: 700 }}>
                  Score: {result.totalScore} / {result.maxScore}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(result.totalScore / result.maxScore) * 100}
                  sx={{ mt: 2, height: 10, borderRadius: 5,
                    '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #667eea, #27ae60)' }
                  }}
                />
              </Box>
            )}
            <Typography variant="body1" sx={{ color: '#555', mb: 3 }}>
              Your assessment has been submitted and evaluated by our AI system.
              The HR and Practice team will review your results.
            </Typography>
            <Typography variant="body2" sx={{ color: '#999' }}>
              You may now close this page. Thank you for your time!
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {/* Sticky Header with Timer */}
      <AppBar position="sticky" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Toolbar>
          <Quiz sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Technical Assessment — {assessment?.candidateName}
          </Typography>
          <Chip
            icon={<Timer />}
            label={formatTime(timeLeft)}
            sx={{
              fontWeight: 700,
              fontSize: '1.1rem',
              px: 1,
              color: timeLeft < 300 ? '#fff' : '#fff',
              backgroundColor: timeLeft < 300 ? '#e74c3c' : 'rgba(255,255,255,0.2)',
              animation: timeLeft < 60 ? 'pulse 1s infinite' : 'none',
              '@keyframes pulse': { '0%': { opacity: 1 }, '50%': { opacity: 0.5 }, '100%': { opacity: 1 } }
            }}
          />
          <Chip
            label={`${answeredCount}/${totalQuestions} answered`}
            sx={{ ml: 1, color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)' }}
          />
        </Toolbar>
      </AppBar>

      {/* Time Warning */}
      {showTimeWarning && timeLeft > 0 && timeLeft <= 300 && (
        <Alert severity="warning" icon={<Warning />}
          onClose={() => setShowTimeWarning(false)}
          sx={{ borderRadius: 0 }}>
          Less than 5 minutes remaining! Please submit your answers soon.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ borderRadius: 0 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Progress */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Progress</Typography>
            <Typography variant="body2">{answeredCount} of {totalQuestions} questions answered</Typography>
          </Box>
          <LinearProgress variant="determinate" value={totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}
            sx={{ height: 8, borderRadius: 4 }} />
        </Paper>

        {/* Objective Questions */}
        {assessment?.questions?.objective && (
          <>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Quiz sx={{ color: '#667eea' }} /> Objective Questions (20)
            </Typography>
            <Typography variant="body2" sx={{ color: '#777', mb: 3 }}>
              Each question carries 1 point. Select the best answer.
            </Typography>

            {assessment.questions.objective.map((q, index) => (
              <Paper key={q.id} elevation={0} sx={{ p: 3, mb: 2, borderRadius: 2,
                border: answers[q.id.toString()] ? '2px solid #27ae60' : '1px solid #e0e0e0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: '#667eea', fontWeight: 600 }}>
                    Q{index + 1}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label={q.difficulty} size="small" variant="outlined"
                      color={q.difficulty === 'easy' ? 'success' : q.difficulty === 'hard' ? 'error' : 'warning'} />
                    <Chip label={q.topic} size="small" variant="outlined" />
                  </Box>
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                  {q.question}
                </Typography>
                <RadioGroup
                  value={answers[q.id.toString()] || ''}
                  onChange={(e) => handleObjectiveAnswer(q.id, e.target.value)}
                >
                  {q.options && Object.entries(q.options).map(([key, value]) => (
                    <FormControlLabel
                      key={key}
                      value={key}
                      control={<Radio size="small" />}
                      label={
                        <Typography variant="body2">
                          <strong>{key}.</strong> {value}
                        </Typography>
                      }
                      sx={{ mb: 0.5, ml: 0, '&:hover': { backgroundColor: '#f5f5f5', borderRadius: 1 } }}
                    />
                  ))}
                </RadioGroup>
              </Paper>
            ))}
          </>
        )}

        {/* Coding Questions */}
        {assessment?.questions?.coding && (
          <>
            <Divider sx={{ my: 4 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Code sx={{ color: '#764ba2' }} /> Coding Questions (5)
            </Typography>
            <Typography variant="body2" sx={{ color: '#777', mb: 3 }}>
              Each question carries 16 points. Write your code solution below.
            </Typography>

            {assessment.questions.coding.map((q, index) => (
              <Paper key={q.id} elevation={0} sx={{ p: 3, mb: 2, borderRadius: 2,
                border: answers[q.id.toString()] ? '2px solid #27ae60' : '1px solid #e0e0e0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: '#764ba2', fontWeight: 600 }}>
                    Coding Q{index + 1}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label={q.difficulty} size="small" variant="outlined"
                      color={q.difficulty === 'hard' ? 'error' : 'warning'} />
                    <Chip label={q.topic} size="small" variant="outlined" />
                  </Box>
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                  {q.question}
                </Typography>
                <Paper elevation={0} sx={{ p: 2, mb: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>Example:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    Input: {q.exampleInput}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    Output: {q.exampleOutput}
                  </Typography>
                </Paper>
                <TextField
                  fullWidth
                  multiline
                  minRows={6}
                  maxRows={15}
                  placeholder="Write your code solution here..."
                  value={answers[q.id.toString()] || ''}
                  onChange={(e) => handleCodingAnswer(q.id, e.target.value)}
                  sx={{
                    '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.9rem' },
                    '& .MuiOutlinedInput-root': { backgroundColor: '#fafafa' }
                  }}
                />
              </Paper>
            ))}
          </>
        )}

        {/* Submit Button */}
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => setShowConfirmDialog(true)}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
            sx={{
              px: 6, py: 1.5,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4292 100%)' }
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Assessment'}
          </Button>
          <Typography variant="body2" sx={{ color: '#999', mt: 1 }}>
            {answeredCount < totalQuestions
              ? `You have ${totalQuestions - answeredCount} unanswered question(s).`
              : 'All questions answered!'}
          </Typography>
        </Box>
      </Container>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>Submit Assessment?</DialogTitle>
        <DialogContent>
          <Typography>
            You have answered {answeredCount} out of {totalQuestions} questions.
            {answeredCount < totalQuestions && ' Unanswered questions will receive 0 points.'}
          </Typography>
          <Typography sx={{ mt: 1, fontWeight: 600 }}>
            Once submitted, you cannot modify your answers.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitAnswers} disabled={submitting}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            Confirm Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CandidateAssessment;
