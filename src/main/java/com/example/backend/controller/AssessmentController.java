package com.example.backend.controller;

import com.example.backend.model.CandidateAnswer;
import com.example.backend.model.CandidateApplication;
import com.example.backend.model.CandidateAssessment;
import com.example.backend.model.TechStack;
import com.example.backend.repository.CandidateAnswerRepository;
import com.example.backend.repository.CandidateApplicationRepository;
import com.example.backend.repository.CandidateAssessmentRepository;
import com.example.backend.service.AIAgentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/assessment")
public class AssessmentController {

    private static final Logger log = LoggerFactory.getLogger(AssessmentController.class);

    private final CandidateAssessmentRepository assessmentRepo;
    private final CandidateAnswerRepository answerRepo;
    private final CandidateApplicationRepository candidateRepo;
    private final AIAgentService aiAgentService;

    // Track in-flight pre-generation requests to avoid duplicate work
    private final Set<Long> generatingCandidates = ConcurrentHashMap.newKeySet();

    public AssessmentController(CandidateAssessmentRepository assessmentRepo,
                                CandidateAnswerRepository answerRepo,
                                CandidateApplicationRepository candidateRepo,
                                AIAgentService aiAgentService) {
        this.assessmentRepo = assessmentRepo;
        this.answerRepo = answerRepo;
        this.candidateRepo = candidateRepo;
        this.aiAgentService = aiAgentService;
    }

    /**
     * Pre-generate assessment questions asynchronously.
     * Called when verification form loads so questions are ready by the time
     * the candidate finishes recording and submits verification.
     * Returns immediately with status; generation happens in the background.
     */
    @PostMapping("/pre-generate/{candidateId}")
    public ResponseEntity<?> preGenerateAssessment(@PathVariable Long candidateId) {
        CandidateApplication candidate = candidateRepo.findById(candidateId).orElse(null);
        if (candidate == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Candidate not found"));
        }

        // If assessment already exists, return it
        Optional<CandidateAssessment> existing =
                assessmentRepo.findTopByCandidateIdOrderByCreatedAtDesc(candidateId);
        if (existing.isPresent()) {
            CandidateAssessment a = existing.get();
            return ResponseEntity.ok(Map.of(
                    "assessmentId", a.getId(),
                    "status", a.getStatus(),
                    "preGenerating", false,
                    "message", "Assessment already exists"));
        }

        // If already being generated, return in-progress status
        if (generatingCandidates.contains(candidateId)) {
            return ResponseEntity.ok(Map.of(
                    "preGenerating", true,
                    "message", "Assessment generation is in progress"));
        }

        // Start async generation
        generateAssessmentAsync(candidateId, candidate);

        return ResponseEntity.accepted().body(Map.of(
                "preGenerating", true,
                "message", "Assessment question generation started in background"));
    }

    /**
     * Check pre-generation status for a candidate.
     */
    @GetMapping("/pre-generate/{candidateId}/status")
    public ResponseEntity<?> getPreGenerateStatus(@PathVariable Long candidateId) {
        Optional<CandidateAssessment> existing =
                assessmentRepo.findTopByCandidateIdOrderByCreatedAtDesc(candidateId);
        if (existing.isPresent()) {
            CandidateAssessment a = existing.get();
            if (hasUsableQuestions(aiAgentService.parseQuestionsJson(a.getQuestionsJson()))) {
                return ResponseEntity.ok(Map.of(
                        "ready", true,
                        "assessmentId", a.getId(),
                        "status", a.getStatus()));
            }
        }

        boolean generating = generatingCandidates.contains(candidateId);
        return ResponseEntity.ok(Map.of(
                "ready", false,
                "generating", generating));
    }

    @Async
    protected CompletableFuture<Void> generateAssessmentAsync(Long candidateId,
                                                               CandidateApplication candidate) {
        generatingCandidates.add(candidateId);
        try {
            String candidateName = candidate.getFirstName() + " " + candidate.getLastName();
            List<String> techStackNames = candidate.getTechStacks().stream()
                    .map(TechStack::getName)
                    .collect(Collectors.toList());

            log.info("Starting async assessment generation for candidate {}", candidateId);
            String questionsJson = aiAgentService.generateAssessmentQuestions(
                    candidateName, techStackNames, candidate.getWorkExperience());

            CandidateAssessment assessment = new CandidateAssessment();
            assessment.setCandidate(candidate);
            assessment.setQuestionsJson(questionsJson);
            assessment.setTimeLimitMinutes(45);
            assessmentRepo.save(assessment);

            log.info("Async assessment generation completed for candidate {}", candidateId);
        } catch (Exception e) {
            log.error("Async assessment generation failed for candidate {}", candidateId, e);
        } finally {
            generatingCandidates.remove(candidateId);
        }
        return CompletableFuture.completedFuture(null);
    }

    /**
     * Generate a new assessment for a candidate (called after verification).
     */
    @PostMapping("/generate/{candidateId}")
    public ResponseEntity<?> generateAssessment(@PathVariable Long candidateId) {
        CandidateApplication candidate = candidateRepo.findById(candidateId).orElse(null);
        if (candidate == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Candidate not found"));
        }

        // Check if assessment already exists
        Optional<CandidateAssessment> existing =
                assessmentRepo.findTopByCandidateIdOrderByCreatedAtDesc(candidateId);
        if (existing.isPresent() && !"EVALUATED".equals(existing.get().getStatus())) {
            CandidateAssessment a = existing.get();
            if (!hasUsableQuestions(aiAgentService.parseQuestionsJson(a.getQuestionsJson()))) {
                a = regenerateQuestionsForAssessment(a);
                return ResponseEntity.ok(Map.of(
                        "assessmentId", a.getId(),
                        "status", a.getStatus(),
                        "message", "Assessment regenerated successfully"));
            }
            return ResponseEntity.ok(Map.of(
                    "assessmentId", a.getId(),
                    "status", a.getStatus(),
                    "message", "Assessment already exists"));
        }

        String candidateName = candidate.getFirstName() + " " + candidate.getLastName();
        List<String> techStackNames = candidate.getTechStacks().stream()
                .map(TechStack::getName)
                .collect(Collectors.toList());

        try {
            String questionsJson = aiAgentService.generateAssessmentQuestions(
                    candidateName, techStackNames, candidate.getWorkExperience());

            CandidateAssessment assessment = new CandidateAssessment();
            assessment.setCandidate(candidate);
            assessment.setQuestionsJson(questionsJson);
            assessment.setTimeLimitMinutes(45);
            assessment = assessmentRepo.save(assessment);

            return ResponseEntity.ok(Map.of(
                    "assessmentId", assessment.getId(),
                    "status", assessment.getStatus(),
                    "message", "Assessment generated successfully"));
        } catch (Exception e) {
            log.error("Failed to generate assessment for candidate {}", candidateId, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to generate assessment questions"));
        }
    }

    /**
     * Fetch assessment questions for the candidate to take.
     */
    @GetMapping("/{assessmentId}")
    public ResponseEntity<?> getAssessment(@PathVariable Long assessmentId) {
        CandidateAssessment assessment = assessmentRepo.findById(assessmentId).orElse(null);
        if (assessment == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Assessment not found"));
        }

        // Mark as IN_PROGRESS and record start time if first access
        if ("GENERATED".equals(assessment.getStatus())) {
            assessment.setStatus("IN_PROGRESS");
            assessment.setStartedAt(Instant.now());
            assessment = assessmentRepo.save(assessment);
        }

        Map<String, Object> questionsData = aiAgentService.parseQuestionsJson(assessment.getQuestionsJson());
        if (!hasUsableQuestions(questionsData)) {
            log.warn("Assessment {} has empty or invalid questions. Regenerating.", assessmentId);
            assessment = regenerateQuestionsForAssessment(assessment);
            questionsData = aiAgentService.parseQuestionsJson(assessment.getQuestionsJson());
        }

        if (!hasUsableQuestions(questionsData)) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Assessment questions are not available right now. Please try again shortly."
            ));
        }

        // Remove correct answers from the response sent to candidates
        Map<String, Object> sanitized = sanitizeQuestionsForCandidate(questionsData);

        Map<String, Object> response = new HashMap<>();
        response.put("assessmentId", assessment.getId());
        response.put("candidateId", assessment.getCandidate().getId());
        response.put("candidateName", assessment.getCandidate().getFirstName() + " "
                + assessment.getCandidate().getLastName());
        response.put("status", assessment.getStatus());
        response.put("timeLimitMinutes", assessment.getTimeLimitMinutes());
        response.put("startedAt", assessment.getStartedAt());
        response.put("questions", sanitized);

        return ResponseEntity.ok(response);
    }

    /**
     * Submit answers for evaluation.
     */
    @PostMapping("/{assessmentId}/submit")
    public ResponseEntity<?> submitAssessment(
            @PathVariable Long assessmentId,
            @RequestBody Map<String, Object> body) {

        CandidateAssessment assessment = assessmentRepo.findById(assessmentId).orElse(null);
        if (assessment == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Assessment not found"));
        }

        if ("SUBMITTED".equals(assessment.getStatus()) || "EVALUATED".equals(assessment.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Assessment already submitted"));
        }

        @SuppressWarnings("unchecked")
        Map<String, String> answers = (Map<String, String>) body.get("answers");
        if (answers == null || answers.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No answers provided"));
        }

        // Save individual answers in batch
        Map<Integer, String> answerMap = new HashMap<>();
        List<CandidateAnswer> answersToSave = new ArrayList<>();
        for (Map.Entry<String, String> entry : answers.entrySet()) {
            try {
                int questionId = Integer.parseInt(entry.getKey());
                String answer = entry.getValue();

                CandidateAnswer candidateAnswer = new CandidateAnswer();
                candidateAnswer.setAssessment(assessment);
                candidateAnswer.setQuestionId(questionId);
                candidateAnswer.setQuestionType(questionId <= 20 ? "OBJECTIVE" : "CODING");
                candidateAnswer.setCandidateAnswer(answer);
                answersToSave.add(candidateAnswer);

                answerMap.put(questionId, answer);
            } catch (NumberFormatException e) {
                log.warn("Invalid question ID: {}", entry.getKey());
            }
        }
        answerRepo.saveAll(answersToSave);

        assessment.setStatus("SUBMITTED");
        assessment.setSubmittedAt(Instant.now());
        assessment = assessmentRepo.save(assessment);

        // Evaluate answers using AI
        try {
            String evaluationJson = aiAgentService.evaluateAssessmentAnswers(
                    assessment.getQuestionsJson(), answerMap);

            Map<String, Object> evaluation = aiAgentService.parseEvaluationJson(evaluationJson);

            assessment.setEvaluationJson(evaluationJson);
            assessment.setStatus("EVALUATED");

            if (evaluation.containsKey("totalScore")) {
                assessment.setTotalScore(((Number) evaluation.get("totalScore")).intValue());
            }
            if (evaluation.containsKey("maxScore")) {
                assessment.setMaxScore(((Number) evaluation.get("maxScore")).intValue());
            }

            assessment = assessmentRepo.save(assessment);

            return ResponseEntity.ok(Map.of(
                    "assessmentId", assessment.getId(),
                    "status", "EVALUATED",
                    "message", "Assessment submitted and evaluated successfully",
                    "totalScore", assessment.getTotalScore() != null ? assessment.getTotalScore() : 0,
                    "maxScore", assessment.getMaxScore() != null ? assessment.getMaxScore() : 100));
        } catch (Exception e) {
            log.error("AI evaluation failed for assessment {}", assessmentId, e);
            return ResponseEntity.ok(Map.of(
                    "assessmentId", assessment.getId(),
                    "status", "SUBMITTED",
                    "message", "Assessment submitted. Evaluation is pending."));
        }
    }

    /**
     * Get assessment report (for HR and Practice team).
     */
    @GetMapping("/{assessmentId}/report")
    public ResponseEntity<?> getReport(@PathVariable Long assessmentId) {
        CandidateAssessment assessment = assessmentRepo.findById(assessmentId).orElse(null);
        if (assessment == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Assessment not found"));
        }

        CandidateApplication candidate = assessment.getCandidate();
        String candidateName = candidate.getFirstName() + " " + candidate.getLastName();

        Map<String, Object> response = new HashMap<>();
        response.put("assessmentId", assessment.getId());
        response.put("candidateId", candidate.getId());
        response.put("candidateName", candidateName);
        response.put("candidateEmail", candidate.getEmail());
        response.put("status", assessment.getStatus());
        response.put("timeLimitMinutes", assessment.getTimeLimitMinutes());
        response.put("startedAt", assessment.getStartedAt());
        response.put("submittedAt", assessment.getSubmittedAt());
        response.put("createdAt", assessment.getCreatedAt());

        List<String> techStackNames = candidate.getTechStacks().stream()
                .map(TechStack::getName)
                .collect(Collectors.toList());
        response.put("techStacks", techStackNames);

        // Include full questions with correct answers for the report
        Map<String, Object> questionsData = aiAgentService.parseQuestionsJson(assessment.getQuestionsJson());
        response.put("questions", questionsData);

        // Include candidate's answers
        List<CandidateAnswer> answers = answerRepo.findByAssessmentId(assessmentId);
        Map<Integer, String> answerMap = new HashMap<>();
        for (CandidateAnswer a : answers) {
            answerMap.put(a.getQuestionId(), a.getCandidateAnswer());
        }
        response.put("candidateAnswers", answerMap);

        // Include evaluation
        if (assessment.getEvaluationJson() != null) {
            Map<String, Object> evaluation = aiAgentService.parseEvaluationJson(assessment.getEvaluationJson());
            response.put("evaluation", evaluation);
            response.put("totalScore", assessment.getTotalScore());
            response.put("maxScore", assessment.getMaxScore());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Get report for a candidate by candidate ID (convenience endpoint).
     */
    @GetMapping("/candidate/{candidateId}/report")
    public ResponseEntity<?> getReportByCandidate(@PathVariable Long candidateId) {
        Optional<CandidateAssessment> assessment =
                assessmentRepo.findTopByCandidateIdOrderByCreatedAtDesc(candidateId);
        if (assessment.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No assessment found for this candidate"));
        }
        return getReport(assessment.get().getId());
    }

    /**
     * Remove correct answers before sending questions to the candidate.
     */
    private CandidateAssessment regenerateQuestionsForAssessment(CandidateAssessment assessment) {
        CandidateApplication candidate = assessment.getCandidate();
        String candidateName = candidate.getFirstName() + " " + candidate.getLastName();
        List<String> techStackNames = candidate.getTechStacks().stream()
                .map(TechStack::getName)
                .collect(Collectors.toList());

        String questionsJson = aiAgentService.generateAssessmentQuestions(
                candidateName,
                techStackNames,
                candidate.getWorkExperience());

        assessment.setQuestionsJson(questionsJson);
        return assessmentRepo.save(assessment);
    }

    @SuppressWarnings("unchecked")
    private boolean hasUsableQuestions(Map<String, Object> questionsData) {
        Object objective = questionsData.get("objective");
        Object coding = questionsData.get("coding");
        boolean hasObjective = objective instanceof List<?> && !((List<?>) objective).isEmpty();
        boolean hasCoding = coding instanceof List<?> && !((List<?>) coding).isEmpty();
        return hasObjective || hasCoding;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> sanitizeQuestionsForCandidate(Map<String, Object> questionsData) {
        Map<String, Object> sanitized = new HashMap<>(questionsData);

        if (sanitized.containsKey("objective")) {
            List<Map<String, Object>> objectives = (List<Map<String, Object>>) sanitized.get("objective");
            List<Map<String, Object>> cleaned = new ArrayList<>();
            for (Map<String, Object> q : objectives) {
                Map<String, Object> cleanQ = new HashMap<>(q);
                cleanQ.remove("correctAnswer");
                cleaned.add(cleanQ);
            }
            sanitized.put("objective", cleaned);
        }

        if (sanitized.containsKey("coding")) {
            List<Map<String, Object>> codings = (List<Map<String, Object>>) sanitized.get("coding");
            List<Map<String, Object>> cleaned = new ArrayList<>();
            for (Map<String, Object> q : codings) {
                Map<String, Object> cleanQ = new HashMap<>(q);
                cleanQ.remove("correctApproach");
                cleaned.add(cleanQ);
            }
            sanitized.put("coding", cleaned);
        }

        return sanitized;
    }
}
