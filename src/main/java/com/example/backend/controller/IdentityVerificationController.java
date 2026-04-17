package com.example.backend.controller;

import com.example.backend.model.CandidateApplication;
import com.example.backend.model.CandidateAssessment;
import com.example.backend.model.IdentityVerification;
import com.example.backend.model.TechStack;
import com.example.backend.repository.CandidateApplicationRepository;
import com.example.backend.repository.CandidateAssessmentRepository;
import com.example.backend.repository.IdentityVerificationRepository;
import com.example.backend.service.AIAgentService;
import com.example.backend.service.IdentityVerificationService;
import com.example.backend.service.S3Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/identity-verification")
public class IdentityVerificationController {

    private static final Logger log = LoggerFactory.getLogger(IdentityVerificationController.class);

    private static final String FIRST_ROUND_QUESTION =
            "Please state your full name and the position you applied for.";

    private final CandidateApplicationRepository candidateRepo;
    private final IdentityVerificationRepository verificationRepo;
    private final CandidateAssessmentRepository assessmentRepo;
    private final IdentityVerificationService verificationService;
    private final AIAgentService aiAgentService;
    private final S3Service s3Service;

    public IdentityVerificationController(CandidateApplicationRepository candidateRepo,
                                          IdentityVerificationRepository verificationRepo,
                                          CandidateAssessmentRepository assessmentRepo,
                                          IdentityVerificationService verificationService,
                                          AIAgentService aiAgentService,
                                          S3Service s3Service) {
        this.candidateRepo = candidateRepo;
        this.verificationRepo = verificationRepo;
        this.assessmentRepo = assessmentRepo;
        this.verificationService = verificationService;
        this.aiAgentService = aiAgentService;
        this.s3Service = s3Service;
    }

    @GetMapping("/{candidateId}/question")
    public ResponseEntity<?> getVerificationQuestion(@PathVariable Long candidateId) {
        CandidateApplication candidate = candidateRepo.findById(candidateId).orElse(null);
        if (candidate == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Candidate not found"));
        }

        List<IdentityVerification> existing = verificationRepo
                .findByCandidateIdOrderByRoundNumberDesc(candidateId);
        int nextRound = existing.isEmpty() ? 2 : existing.get(0).getRoundNumber() + 1;

        String candidateName = candidate.getFirstName() + " " + candidate.getLastName();
        List<String> techStackNames = candidate.getTechStacks().stream()
                .map(TechStack::getName)
                .collect(Collectors.toList());

        String question;
        if (nextRound == 2 || existing.isEmpty()) {
            question = FIRST_ROUND_QUESTION;
        } else {
            // Build previous Q&A history for AI-generated follow-up
            List<Map<String, String>> previousQA = new ArrayList<>();
            // Iterate oldest-first
            List<IdentityVerification> orderedExisting = new ArrayList<>(existing);
            Collections.reverse(orderedExisting);
            for (IdentityVerification v : orderedExisting) {
                previousQA.add(Map.of(
                        "question", v.getQuestion(),
                        "answer", v.getAiAnalysisDetails() != null ? v.getAiAnalysisDetails() : "(recorded)"
                ));
            }
            try {
                question = aiAgentService.generateNextQuestion(candidateName, techStackNames, previousQA);
            } catch (Exception e) {
                log.error("AI question generation failed, using fallback", e);
                question = "Describe a challenging technical problem you solved recently.";
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("candidateId", candidateId);
        response.put("candidateName", candidateName);
        response.put("roundNumber", nextRound);
        response.put("question", question);
        response.put("hasOriginalVideo", candidate.getVideoS3Key() != null);
        response.put("hasOriginalPhoto", candidate.getPhotoS3Key() != null);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{candidateId}/verify")
    public ResponseEntity<?> submitVerification(
            @PathVariable Long candidateId,
            @RequestParam("video") MultipartFile videoFile,
            @RequestParam("snapshot") MultipartFile snapshotFile,
            @RequestParam("question") String question,
            @RequestParam("roundNumber") Integer roundNumber,
            @RequestParam(value = "videoFrame", required = false) MultipartFile videoFrameFile,
            @RequestParam(value = "audioPresent", required = false, defaultValue = "true") Boolean audioPresent) {

        CandidateApplication candidate = candidateRepo.findById(candidateId).orElse(null);
        if (candidate == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Candidate not found"));
        }

        if (videoFile.isEmpty() || snapshotFile.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Both video and snapshot are required"));
        }

        if (candidate.getPhotoS3Key() == null && candidate.getVideoS3Key() == null) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "No original registration photo or video found. Round 1 must be completed first."));
        }

        IdentityVerification verification = new IdentityVerification();
        verification.setCandidate(candidate);
        verification.setRoundNumber(roundNumber);
        verification.setQuestion(question);
        verification.setFaceMatchResult("PENDING");
        verification.setOverallResult("PENDING");

        try {
            // Upload video and snapshot to S3
            String videoKey = s3Service.buildVerificationVideoKey(candidateId, roundNumber);
            s3Service.uploadFile(videoKey, videoFile.getBytes(), videoFile.getContentType());
            verification.setVideoS3Key(videoKey);

            String snapshotKey = s3Service.buildVerificationSnapshotKey(candidateId, roundNumber);
            s3Service.uploadFile(snapshotKey, snapshotFile.getBytes(), snapshotFile.getContentType());
            verification.setSnapshotS3Key(snapshotKey);

            verification = verificationRepo.save(verification);

            // Download original photo
            byte[] originalImageBytes;
            if (candidate.getPhotoS3Key() != null) {
                originalImageBytes = s3Service.downloadFile(candidate.getPhotoS3Key());
            } else {
                verification.setFaceMatchResult("ERROR");
                verification.setOverallResult("ERROR");
                verification.setAiAnalysisDetails("No original registration photo available.");
                verificationRepo.save(verification);
                return ResponseEntity.ok(buildVerificationResponse(verification,
                        "Verification recorded but comparison could not be performed."));
            }

            byte[] verificationSnapshotBytes = snapshotFile.getBytes();
            byte[] videoFrameBytes = (videoFrameFile != null && !videoFrameFile.isEmpty())
                    ? videoFrameFile.getBytes() : null;

            // Perform multi-factor verification (photo + video + audio)
            log.info("Starting multi-factor verification for candidate {} round {}", candidateId, roundNumber);
            Map<String, Object> fullResult = verificationService.performFullVerification(
                    originalImageBytes, verificationSnapshotBytes, videoFrameBytes,
                    Boolean.TRUE.equals(audioPresent));

            // Save all results to entity
            verification.setFaceMatchResult((String) fullResult.get("photoMatchResult"));
            verification.setFaceMatchConfidence((Double) fullResult.get("photoMatchConfidence"));
            verification.setVideoMatchResult((String) fullResult.get("videoMatchResult"));
            verification.setVideoMatchConfidence((Double) fullResult.get("videoMatchConfidence"));
            verification.setAudioPresent(Boolean.TRUE.equals(audioPresent));
            verification.setOverallResult((String) fullResult.get("overallResult"));
            verification.setOverallConfidence((Double) fullResult.get("overallConfidence"));

            // Get AI analysis combining all signals
            String candidateName = candidate.getFirstName() + " " + candidate.getLastName();
            try {
                String aiAnalysis = aiAgentService.analyzeIdentityVerification(
                        (Double) fullResult.get("photoMatchConfidence"),
                        (String) fullResult.get("photoMatchResult"),
                        "MATCH".equals(fullResult.get("videoMatchResult")),
                        Boolean.TRUE.equals(audioPresent),
                        candidateName);
                verification.setAiAnalysisDetails(aiAnalysis);
            } catch (Exception e) {
                log.error("AI analysis failed", e);
                StringBuilder details = new StringBuilder();
                details.append("Photo: ").append(fullResult.get("photoMatchResult"))
                        .append(" (").append(String.format("%.1f%%", fullResult.get("photoMatchConfidence"))).append(")");
                details.append(" | Video: ").append(fullResult.get("videoMatchResult"));
                details.append(" | Audio: ").append(audioPresent ? "Present" : "Absent");
                verification.setAiAnalysisDetails(details.toString());
            }

            verification = verificationRepo.save(verification);

            String overallResult = (String) fullResult.get("overallResult");
            String message;
            if ("MATCH".equals(overallResult)) {
                message = "Identity verified successfully! Multi-factor verification passed.";
            } else if ("MISMATCH".equals(overallResult)) {
                message = "Identity verification FAILED. The person does NOT match the original registration.";
            } else {
                message = "Verification could not be completed. Please try again.";
            }

            Map<String, Object> responseMap = buildVerificationResponse(verification, message);
            responseMap.put("overallResult", overallResult);
            responseMap.put("overallConfidence", fullResult.get("overallConfidence"));
            responseMap.put("videoMatchResult", fullResult.get("videoMatchResult"));
            responseMap.put("audioPresent", audioPresent);

            // If verification passed, check if assessment should be generated
            if ("MATCH".equals(overallResult)) {
                Optional<CandidateAssessment> existingAssessment =
                        assessmentRepo.findTopByCandidateIdOrderByCreatedAtDesc(candidateId);
                if (existingAssessment.isPresent()) {
                    // Pre-generated assessment is ready
                    responseMap.put("assessmentId", existingAssessment.get().getId());
                    responseMap.put("assessmentReady", true);
                } else {
                    // Pre-generation not done yet — generate inline as fallback
                    try {
                        List<String> techStackNames = candidate.getTechStacks().stream()
                                .map(TechStack::getName)
                                .collect(Collectors.toList());
                        String questionsJson = aiAgentService.generateAssessmentQuestions(
                                candidateName, techStackNames, candidate.getWorkExperience());

                        CandidateAssessment assessment = new CandidateAssessment();
                        assessment.setCandidate(candidate);
                        assessment.setQuestionsJson(questionsJson);
                        assessment.setTimeLimitMinutes(45);
                        assessment = assessmentRepo.save(assessment);

                        responseMap.put("assessmentId", assessment.getId());
                        responseMap.put("assessmentReady", true);
                    } catch (Exception e) {
                        log.error("Failed to generate assessment for candidate {}", candidateId, e);
                        responseMap.put("assessmentReady", false);
                        responseMap.put("assessmentError", "Assessment generation failed. Contact HR.");
                    }
                }
            }

            return ResponseEntity.ok(responseMap);

        } catch (IOException e) {
            log.error("Failed to process verification files for candidate {}", candidateId, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to process verification files"));
        }
    }

    @GetMapping("/{candidateId}/results")
    public ResponseEntity<?> getVerificationResults(@PathVariable Long candidateId) {
        CandidateApplication candidate = candidateRepo.findById(candidateId).orElse(null);
        if (candidate == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Candidate not found"));
        }

        List<IdentityVerification> verifications = verificationRepo
                .findByCandidateIdOrderByRoundNumberDesc(candidateId);

        List<Map<String, Object>> results = new ArrayList<>();
        for (IdentityVerification v : verifications) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("id", v.getId());
            entry.put("roundNumber", v.getRoundNumber());
            entry.put("question", v.getQuestion());
            entry.put("faceMatchResult", v.getFaceMatchResult());
            entry.put("faceMatchConfidence", v.getFaceMatchConfidence());
            entry.put("videoMatchResult", v.getVideoMatchResult());
            entry.put("videoMatchConfidence", v.getVideoMatchConfidence());
            entry.put("audioPresent", v.getAudioPresent());
            entry.put("overallResult", v.getOverallResult());
            entry.put("overallConfidence", v.getOverallConfidence());
            entry.put("aiAnalysisDetails", v.getAiAnalysisDetails());
            entry.put("createdAt", v.getCreatedAt());

            if (v.getVideoS3Key() != null) {
                entry.put("videoUrl", s3Service.generatePresignedUrl(v.getVideoS3Key()));
            }
            if (v.getSnapshotS3Key() != null) {
                entry.put("snapshotUrl", s3Service.generatePresignedUrl(v.getSnapshotS3Key()));
            }

            results.add(entry);
        }

        // Include any assessment info
        Optional<CandidateAssessment> assessment =
                assessmentRepo.findTopByCandidateIdOrderByCreatedAtDesc(candidateId);
        Map<String, Object> responseData = new HashMap<>();
        responseData.put("candidateId", candidateId);
        responseData.put("candidateName", candidate.getFirstName() + " " + candidate.getLastName());
        responseData.put("verifications", results);
        assessment.ifPresent(a -> {
            responseData.put("assessmentId", a.getId());
            responseData.put("assessmentStatus", a.getStatus());
            if (a.getTotalScore() != null) {
                responseData.put("assessmentScore", a.getTotalScore());
                responseData.put("assessmentMaxScore", a.getMaxScore());
            }
        });

        return ResponseEntity.ok(responseData);
    }

    private Map<String, Object> buildVerificationResponse(IdentityVerification v, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("verificationId", v.getId());
        response.put("candidateId", v.getCandidate().getId());
        response.put("roundNumber", v.getRoundNumber());
        response.put("faceMatchResult", v.getFaceMatchResult());
        response.put("faceMatchConfidence", v.getFaceMatchConfidence());
        response.put("aiAnalysisDetails", v.getAiAnalysisDetails());
        response.put("message", message);
        return response;
    }
}
