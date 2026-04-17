import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ArrowBack,
  Assessment,
  CheckCircle,
  Cancel,
  Star,
  TrendingUp,
  TrendingDown,
  ThumbUp,
  ThumbDown,
  HorizontalRule,
  ExpandMore,
  Quiz,
  Code,
  AccessTime,
  Person,
  EmojiEvents
} from '@mui/icons-material';

interface QuestionResult {
  questionId: number;
  type: string;
  correct: boolean;
  score: number;
  maxScore: number;
  feedback: string;
}

interface ObjectiveQuestion {
  id: number;
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  difficulty: string;
  topic: string;
}

interface CodingQuestion {
  id: number;
  question: string;
  exampleInput: string;
  exampleOutput: string;
  correctApproach: string;
  difficulty: string;
  topic: string;
}

interface EvaluationData {
  totalScore: number;
  maxScore: number;
  objectiveScore: number;
  objectiveMax: number;
  codingScore: number;
  codingMax: number;
  grade: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  questionResults: QuestionResult[];
}

interface ReportData {
  assessmentId: number;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  status: string;
  timeLimitMinutes: number;
  startedAt: string;
  submittedAt: string;
  techStacks: string[];
  questions: {
    objective: ObjectiveQuestion[];
    coding: CodingQuestion[];
  };
  candidateAnswers: Record<number, string>;
  evaluation: EvaluationData;
  totalScore: number;
  maxScore: number;
}

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const AssessmentReport = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!id) return;
    axios.get(`/api/assessment/${id}/report`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => setReport(res.data))
      .catch(() => setError('Failed to load assessment report.'))
      .finally(() => setLoading(false));
  }, [id, token]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#27ae60';
      case 'B': return '#2980b9';
      case 'C': return '#f39c12';
      case 'D': return '#e67e22';
      case 'F': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getDifficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'HIRE': return '#27ae60';
      case 'CONSIDER': return '#f39c12';
      case 'REJECT': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'HIRE': return <ThumbUp />;
      case 'CONSIDER': return <HorizontalRule />;
      case 'REJECT': return <ThumbDown />;
      default: return null;
    }
  };

  const getTimeTaken = () => {
    if (!report?.startedAt || !report?.submittedAt) return '—';
    const start = new Date(report.startedAt).getTime();
    const end = new Date(report.submittedAt).getTime();
    const mins = Math.floor((end - start) / 60000);
    const secs = Math.floor(((end - start) % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const getResultForQuestion = (questionId: number) =>
    report?.evaluation?.questionResults?.find(qr => qr.questionId === questionId);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Report not found.'}</Alert>
      </Container>
    );
  }

  const evaluation = report.evaluation;
  const scorePercent = evaluation ? (evaluation.totalScore / evaluation.maxScore) * 100 : 0;
  const objectiveCorrectCount = evaluation?.questionResults
    ?.filter(qr => qr.type === 'objective' && qr.correct).length ?? 0;
  const objectiveTotal = report.questions?.objective?.length ?? 20;
  const codingQuestions = report.questions?.coding ?? [];
  const objectiveQuestions = report.questions?.objective ?? [];

  return (
    <Box sx={{ background: '#f5f7fa', minHeight: '100vh' }}>
      <AppBar position="sticky" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Assessment sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Assessment Report
          </Typography>
          {evaluation && (
            <Chip
              icon={getRecommendationIcon(evaluation.recommendation) || undefined}
              label={evaluation.recommendation}
              sx={{
                fontWeight: 700,
                color: 'white',
                backgroundColor: getRecommendationColor(evaluation.recommendation)
              }}
            />
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>

        {/* ── Candidate Header ── */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, background: 'white' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Box sx={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Person sx={{ color: 'white', fontSize: 32 }} />
              </Box>
            </Grid>
            <Grid item xs>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#2c3e50' }}>
                {report.candidateName}
              </Typography>
              <Typography variant="body2" sx={{ color: '#7f8c8d' }}>{report.candidateEmail}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {report.techStacks?.map(ts => (
                  <Chip key={ts} label={ts} size="small" sx={{ fontWeight: 500 }} />
                ))}
              </Box>
            </Grid>
            <Grid item>
              <Box sx={{ textAlign: 'right' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, justifyContent: 'flex-end' }}>
                  <AccessTime sx={{ fontSize: 16, color: '#7f8c8d' }} />
                  <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                    Time Taken: <strong>{getTimeTaken()}</strong> / {report.timeLimitMinutes}m
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#95a5a6' }}>
                  {report.startedAt ? new Date(report.startedAt).toLocaleString() : '—'}
                  {' → '}
                  {report.submittedAt ? new Date(report.submittedAt).toLocaleString() : '—'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* ── Score Overview Cards ── */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Overall Score */}
          <Grid item xs={6} md={3}>
            <Card elevation={0} sx={{ textAlign: 'center', borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
                  <CircularProgress variant="determinate" value={scorePercent}
                    size={90} thickness={6}
                    sx={{ color: scorePercent >= 70 ? '#27ae60' : scorePercent >= 50 ? '#f39c12' : '#e74c3c' }} />
                  <Box sx={{
                    position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
                  }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>
                      {evaluation?.totalScore ?? '—'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#999', fontSize: '0.65rem' }}>
                      / {evaluation?.maxScore ?? 100}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#555' }}>Total Score</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Grade */}
          <Grid item xs={6} md={3}>
            <Card elevation={0} sx={{ textAlign: 'center', borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <EmojiEvents sx={{ fontSize: 28, color: getGradeColor(evaluation?.grade || ''), mb: 0.5 }} />
                <Typography variant="h2" sx={{ fontWeight: 900, color: getGradeColor(evaluation?.grade || ''), lineHeight: 1 }}>
                  {evaluation?.grade ?? '—'}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#555', mt: 0.5 }}>Grade</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Objective Score */}
          <Grid item xs={6} md={3}>
            <Card elevation={0} sx={{ textAlign: 'center', borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Quiz sx={{ fontSize: 28, color: '#667eea', mb: 0.5 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#667eea' }}>
                  {evaluation?.objectiveScore ?? '—'}
                  <Typography component="span" variant="body1" sx={{ color: '#999' }}>
                    /{evaluation?.objectiveMax ?? 20}
                  </Typography>
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#555' }}>
                  Objective ({objectiveCorrectCount}/{objectiveTotal} correct)
                </Typography>
                <LinearProgress variant="determinate"
                  value={evaluation ? (evaluation.objectiveScore / evaluation.objectiveMax) * 100 : 0}
                  sx={{ mt: 1, height: 5, borderRadius: 3 }} />
              </CardContent>
            </Card>
          </Grid>

          {/* Coding Score */}
          <Grid item xs={6} md={3}>
            <Card elevation={0} sx={{ textAlign: 'center', borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Code sx={{ fontSize: 28, color: '#764ba2', mb: 0.5 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#764ba2' }}>
                  {evaluation?.codingScore ?? '—'}
                  <Typography component="span" variant="body1" sx={{ color: '#999' }}>
                    /{evaluation?.codingMax ?? 80}
                  </Typography>
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#555' }}>Coding</Typography>
                <LinearProgress variant="determinate"
                  value={evaluation ? (evaluation.codingScore / evaluation.codingMax) * 100 : 0}
                  sx={{ mt: 1, height: 5, borderRadius: 3,
                    '& .MuiLinearProgress-bar': { backgroundColor: '#764ba2' } }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Tabbed Detail Sections ── */}
        <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
            variant="fullWidth"
            sx={{
              background: '#fff',
              borderBottom: '1px solid #e0e0e0',
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.95rem' }
            }}>
            <Tab icon={<Star sx={{ fontSize: 20 }} />} iconPosition="start" label="AI Summary" />
            <Tab icon={<Quiz sx={{ fontSize: 20 }} />} iconPosition="start"
              label={`Objective (${objectiveCorrectCount}/${objectiveTotal})`} />
            <Tab icon={<Code sx={{ fontSize: 20 }} />} iconPosition="start"
              label={`Coding (${codingQuestions.length})`} />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* ─── Tab 0: AI Summary ─── */}
            <TabPanel value={activeTab} index={0}>
              {evaluation && (
                <>
                  {/* Recommendation Banner */}
                  <Paper elevation={0} sx={{
                    p: 2.5, mb: 3, borderRadius: 2,
                    background: `${getRecommendationColor(evaluation.recommendation)}15`,
                    border: `2px solid ${getRecommendationColor(evaluation.recommendation)}40`
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {getRecommendationIcon(evaluation.recommendation)}
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: getRecommendationColor(evaluation.recommendation) }}>
                          AI Recommendation: {evaluation.recommendation}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#555' }}>
                          Score: {evaluation.totalScore}/{evaluation.maxScore} ({scorePercent.toFixed(1)}%) — Grade: {evaluation.grade}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>

                  {/* Summary */}
                  <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.9, color: '#333' }}>
                    {evaluation.summary}
                  </Typography>

                  <Grid container spacing={3}>
                    {/* Strengths */}
                    <Grid item xs={12} md={6}>
                      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, background: '#f0fff4', border: '1px solid #c6f6d5', height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <TrendingUp sx={{ color: '#27ae60' }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#27ae60' }}>Strengths</Typography>
                        </Box>
                        {evaluation.strengths?.map((s, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                            <CheckCircle sx={{ fontSize: 16, color: '#27ae60', mt: 0.4 }} />
                            <Typography variant="body2" sx={{ color: '#333' }}>{s}</Typography>
                          </Box>
                        ))}
                      </Paper>
                    </Grid>

                    {/* Weaknesses */}
                    <Grid item xs={12} md={6}>
                      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, background: '#fff5f5', border: '1px solid #fed7d7', height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <TrendingDown sx={{ color: '#e74c3c' }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#e74c3c' }}>Areas for Improvement</Typography>
                        </Box>
                        {evaluation.weaknesses?.map((w, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                            <Cancel sx={{ fontSize: 16, color: '#e74c3c', mt: 0.4 }} />
                            <Typography variant="body2" sx={{ color: '#333' }}>{w}</Typography>
                          </Box>
                        ))}
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Score Breakdown Bar */}
                  <Paper elevation={0} sx={{ p: 2.5, mt: 3, borderRadius: 2, background: '#f8f9fa' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#555' }}>
                      Score Distribution
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Quiz sx={{ fontSize: 18, color: '#667eea' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Objective: {evaluation.objectiveScore}/{evaluation.objectiveMax}
                          </Typography>
                        </Box>
                        <LinearProgress variant="determinate"
                          value={(evaluation.objectiveScore / evaluation.objectiveMax) * 100}
                          sx={{ height: 8, borderRadius: 4 }} />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Code sx={{ fontSize: 18, color: '#764ba2' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Coding: {evaluation.codingScore}/{evaluation.codingMax}
                          </Typography>
                        </Box>
                        <LinearProgress variant="determinate"
                          value={(evaluation.codingScore / evaluation.codingMax) * 100}
                          sx={{ height: 8, borderRadius: 4,
                            '& .MuiLinearProgress-bar': { backgroundColor: '#764ba2' } }} />
                      </Grid>
                    </Grid>
                  </Paper>
                </>
              )}
            </TabPanel>

            {/* ─── Tab 1: Objective Questions Detail ─── */}
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Objective Questions — {objectiveCorrectCount}/{objectiveTotal} Correct
                </Typography>
                <Chip label={`${evaluation?.objectiveScore ?? 0}/${evaluation?.objectiveMax ?? 20} pts`}
                  sx={{ fontWeight: 700, background: '#667eea', color: 'white' }} />
              </Box>
              <Divider sx={{ mb: 2 }} />

              {objectiveQuestions.map((q, idx) => {
                const result = getResultForQuestion(q.id);
                const candidateAnswer = report.candidateAnswers?.[q.id];
                const isCorrect = result?.correct ?? false;

                return (
                  <Accordion key={q.id} elevation={0} disableGutters
                    sx={{
                      mb: 1.5, borderRadius: '8px !important', overflow: 'hidden',
                      border: `1.5px solid ${isCorrect ? '#c6f6d5' : '#fed7d7'}`,
                      '&:before': { display: 'none' }
                    }}>
                    <AccordionSummary expandIcon={<ExpandMore />}
                      sx={{ background: isCorrect ? '#f0fff4' : '#fff5f5' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 1 }}>
                        {isCorrect
                          ? <CheckCircle sx={{ color: '#27ae60', fontSize: 22 }} />
                          : <Cancel sx={{ color: '#e74c3c', fontSize: 22 }} />}
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#667eea', minWidth: 32 }}>
                          Q{idx + 1}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, flexGrow: 1, color: '#333' }} noWrap>
                          {q.question}
                        </Typography>
                        <Chip label={q.difficulty} size="small" color={getDifficultyColor(q.difficulty) as 'success' | 'warning' | 'error' | 'default'} variant="outlined" sx={{ mr: 1 }} />
                        <Chip label={q.topic} size="small" variant="outlined" sx={{ mr: 1 }} />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: isCorrect ? '#27ae60' : '#e74c3c' }}>
                          {result?.score ?? 0}/{result?.maxScore ?? 1}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 2.5, background: 'white' }}>
                      {/* Question Text */}
                      <Typography variant="body1" sx={{ fontWeight: 500, mb: 2, color: '#2c3e50' }}>
                        {q.question}
                      </Typography>

                      {/* Options Grid */}
                      <Grid container spacing={1} sx={{ mb: 2 }}>
                        {q.options && Object.entries(q.options).map(([key, value]) => {
                          const isCorrectOption = key === q.correctAnswer;
                          const isCandidateChoice = key === candidateAnswer;
                          let bgColor = '#f8f9fa';
                          let borderColor = '#e0e0e0';
                          let textColor = '#555';
                          if (isCorrectOption) { bgColor = '#f0fff4'; borderColor = '#27ae60'; textColor = '#27ae60'; }
                          if (isCandidateChoice && !isCorrectOption) { bgColor = '#fff5f5'; borderColor = '#e74c3c'; textColor = '#e74c3c'; }

                          return (
                            <Grid item xs={12} sm={6} key={key}>
                              <Paper elevation={0} sx={{
                                p: 1.5, borderRadius: 2,
                                border: `1.5px solid ${borderColor}`,
                                background: bgColor,
                                display: 'flex', alignItems: 'flex-start', gap: 1
                              }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: textColor, minWidth: 20 }}>
                                  {key}.
                                </Typography>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="body2" sx={{ color: textColor }}>
                                    {value}
                                  </Typography>
                                  {isCorrectOption && (
                                    <Chip label="Correct Answer" size="small"
                                      icon={<CheckCircle sx={{ fontSize: 14 }} />}
                                      sx={{ mt: 0.5, height: 20, fontSize: '0.7rem', color: '#27ae60', borderColor: '#27ae60' }}
                                      variant="outlined" />
                                  )}
                                  {isCandidateChoice && !isCorrectOption && (
                                    <Chip label="Candidate's Answer" size="small"
                                      icon={<Cancel sx={{ fontSize: 14 }} />}
                                      sx={{ mt: 0.5, height: 20, fontSize: '0.7rem', color: '#e74c3c', borderColor: '#e74c3c' }}
                                      variant="outlined" />
                                  )}
                                  {isCandidateChoice && isCorrectOption && (
                                    <Chip label="Candidate's Answer ✓" size="small"
                                      icon={<CheckCircle sx={{ fontSize: 14 }} />}
                                      sx={{ mt: 0.5, height: 20, fontSize: '0.7rem', color: '#27ae60', borderColor: '#27ae60' }}
                                      variant="outlined" />
                                  )}
                                </Box>
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>

                      {/* AI Feedback */}
                      {result?.feedback && (
                        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#667eea', display: 'block', mb: 0.5 }}>
                            AI Feedback
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#444', lineHeight: 1.7 }}>
                            {result.feedback}
                          </Typography>
                        </Paper>
                      )}
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </TabPanel>

            {/* ─── Tab 2: Coding Questions Detail ─── */}
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Coding Questions — Detailed Evaluation
                </Typography>
                <Chip label={`${evaluation?.codingScore ?? 0}/${evaluation?.codingMax ?? 80} pts`}
                  sx={{ fontWeight: 700, background: '#764ba2', color: 'white' }} />
              </Box>
              <Divider sx={{ mb: 2 }} />

              {codingQuestions.map((q, idx) => {
                const result = getResultForQuestion(q.id);
                const candidateAnswer = report.candidateAnswers?.[q.id];
                const scorePercent = result ? (result.score / result.maxScore) * 100 : 0;

                return (
                  <Accordion key={q.id} elevation={0} disableGutters defaultExpanded
                    sx={{
                      mb: 2, borderRadius: '8px !important', overflow: 'hidden',
                      border: `1.5px solid ${scorePercent >= 70 ? '#c6f6d5' : scorePercent >= 40 ? '#fefcbf' : '#fed7d7'}`,
                      '&:before': { display: 'none' }
                    }}>
                    <AccordionSummary expandIcon={<ExpandMore />}
                      sx={{
                        background: scorePercent >= 70 ? '#f0fff4' : scorePercent >= 40 ? '#fffff0' : '#fff5f5'
                      }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 1 }}>
                        <Code sx={{ color: '#764ba2', fontSize: 22 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#764ba2', minWidth: 70 }}>
                          Coding {idx + 1}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, flexGrow: 1, color: '#333' }} noWrap>
                          {q.question}
                        </Typography>
                        <Chip label={q.difficulty} size="small" color={getDifficultyColor(q.difficulty) as 'success' | 'warning' | 'error' | 'default'} variant="outlined" sx={{ mr: 1 }} />
                        <Chip label={q.topic} size="small" variant="outlined" sx={{ mr: 1 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{
                            fontWeight: 700,
                            color: scorePercent >= 70 ? '#27ae60' : scorePercent >= 40 ? '#f39c12' : '#e74c3c'
                          }}>
                            {result?.score ?? 0}/{result?.maxScore ?? 16}
                          </Typography>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0, background: 'white' }}>
                      {/* Problem Statement */}
                      <Box sx={{ p: 2.5, borderBottom: '1px solid #f0f0f0' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#764ba2', display: 'block', mb: 1 }}>
                          PROBLEM STATEMENT
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#2c3e50', lineHeight: 1.7 }}>
                          {q.question}
                        </Typography>
                        {(q.exampleInput || q.exampleOutput) && (
                          <Paper elevation={0} sx={{ p: 2, mt: 2, background: '#f8f9fa', borderRadius: 2, fontFamily: 'monospace' }}>
                            {q.exampleInput && (
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                <strong>Input:</strong> {q.exampleInput}
                              </Typography>
                            )}
                            {q.exampleOutput && (
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                <strong>Output:</strong> {q.exampleOutput}
                              </Typography>
                            )}
                          </Paper>
                        )}
                      </Box>

                      {/* Candidate's Solution */}
                      <Box sx={{ p: 2.5, borderBottom: '1px solid #f0f0f0' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#2980b9', display: 'block', mb: 1 }}>
                          CANDIDATE'S SOLUTION
                        </Typography>
                        {candidateAnswer ? (
                          <Paper elevation={0} sx={{
                            p: 2, background: '#1e1e2e', borderRadius: 2, maxHeight: 300, overflow: 'auto'
                          }}>
                            <Typography component="pre" variant="body2" sx={{
                              fontFamily: '"Fira Code", "Consolas", monospace',
                              color: '#cdd6f4', whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0
                            }}>
                              {candidateAnswer}
                            </Typography>
                          </Paper>
                        ) : (
                          <Alert severity="warning" sx={{ borderRadius: 2 }}>
                            No answer submitted for this question.
                          </Alert>
                        )}
                      </Box>

                      {/* Correct Approach */}
                      {q.correctApproach && (
                        <Box sx={{ p: 2.5, borderBottom: '1px solid #f0f0f0', background: '#f0fff4' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#27ae60', display: 'block', mb: 1 }}>
                            CORRECT APPROACH
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#333', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                            {q.correctApproach}
                          </Typography>
                        </Box>
                      )}

                      {/* Score & Feedback */}
                      {result && (
                        <Box sx={{ p: 2.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#764ba2' }}>
                              SCORE
                            </Typography>
                            <LinearProgress variant="determinate" value={scorePercent}
                              sx={{
                                flexGrow: 1, height: 8, borderRadius: 4,
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: scorePercent >= 70 ? '#27ae60' : scorePercent >= 40 ? '#f39c12' : '#e74c3c'
                                }
                              }} />
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {result.score}/{result.maxScore}
                            </Typography>
                          </Box>
                          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#764ba2', display: 'block', mb: 0.5 }}>
                              AI Feedback
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#444', lineHeight: 1.7 }}>
                              {result.feedback}
                            </Typography>
                          </Paper>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </TabPanel>
          </Box>
        </Paper>

      </Container>
    </Box>
  );
};

export default AssessmentReport;
