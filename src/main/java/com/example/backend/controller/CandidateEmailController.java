package com.example.backend.controller;

import com.example.backend.dto.SendEmailRequest;
import com.example.backend.model.CandidateApplication;
import com.example.backend.model.CandidateAssessment;
import com.example.backend.model.TechStack;
import com.example.backend.repository.CandidateApplicationRepository;
import com.example.backend.repository.CandidateAssessmentRepository;
import com.example.backend.repository.TechStackRepository;
import com.example.backend.service.AIAgentService;
import com.example.backend.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/candidate")
public class CandidateEmailController {

    private final TechStackRepository techStackRepository;
    private final CandidateApplicationRepository candidateApplicationRepository;
    private final CandidateAssessmentRepository candidateAssessmentRepository;
    private final AIAgentService aiAgentService;
    private final EmailService emailService;

    public CandidateEmailController(TechStackRepository techStackRepository,
                                    CandidateApplicationRepository candidateApplicationRepository,
                                    CandidateAssessmentRepository candidateAssessmentRepository,
                                    AIAgentService aiAgentService,
                                    EmailService emailService) {
        this.techStackRepository = techStackRepository;
        this.candidateApplicationRepository = candidateApplicationRepository;
        this.candidateAssessmentRepository = candidateAssessmentRepository;
        this.aiAgentService = aiAgentService;
        this.emailService = emailService;
    }

    @GetMapping("/tech-stacks")
    public ResponseEntity<List<TechStack>> getAllTechStacks() {
        return ResponseEntity.ok(techStackRepository.findAllByOrderByCategoryAscNameAsc());
    }

    @PostMapping("/send-email")
    public ResponseEntity<Map<String, String>> sendCandidateEmail(@Valid @RequestBody SendEmailRequest request) {
        String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().toUriString();
        String registrationLink = baseUrl + "/candidate-register";

        String body = request.getContent();
        if (request.getCandidateId() != null) {
            String validationLink = baseUrl + "/identity-verification/" + request.getCandidateId();
            if (!body.contains("/identity-verification/")) {
                body = body + "\n\nIdentity Validation Link: " + validationLink;
            }

            if (Boolean.TRUE.equals(request.getIncludeOnlineExam())) {
                Long assessmentId = getOrCreateAssessment(request.getCandidateId());
                String examLink = baseUrl + "/candidate-assessment/" + assessmentId;
                body = body + "\nOnline Assessment Link: " + examLink
                        + "\nPlease complete the identity validation first and then attend the online exam.";
            } else {
                body = body + "\n\nFinal Round: Please come to the office for the face-to-face interview. HR will contact you with the schedule.";
            }
        } else {
            if (!body.contains("/candidate-register")) {
                body = body + "\n\nCandidate Registration Link: " + registrationLink;
            }
        }

        body = body + "\n\nTech Stack: " + String.join(", ", request.getTechStacks());

        emailService.sendEmail(request.getCandidateEmail(), request.getSubject(), body);
        return ResponseEntity.ok(Map.of("message", "Email sent successfully to " + request.getCandidateEmail()));
    }

    private Long getOrCreateAssessment(Long candidateId) {
        Optional<CandidateAssessment> existingAssessment =
                candidateAssessmentRepository.findTopByCandidateIdOrderByCreatedAtDesc(candidateId);
        if (existingAssessment.isPresent()) {
            CandidateAssessment existing = existingAssessment.get();
            Map<String, Object> parsed = aiAgentService.parseQuestionsJson(existing.getQuestionsJson());
            Object objective = parsed.get("objective");
            Object coding = parsed.get("coding");
            boolean valid = (objective instanceof List<?> && !((List<?>) objective).isEmpty())
                    || (coding instanceof List<?> && !((List<?>) coding).isEmpty());
            if (valid) {
                return existing.getId();
            }
        }

        CandidateApplication candidate = candidateApplicationRepository.findById(candidateId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        String candidateName = candidate.getFirstName() + " " + candidate.getLastName();
        List<String> techStackNames = candidate.getTechStacks().stream()
                .map(TechStack::getName)
                .collect(Collectors.toList());

        String questionsJson = aiAgentService.generateAssessmentQuestions(
                candidateName,
                techStackNames,
                candidate.getWorkExperience());

        CandidateAssessment assessment = existingAssessment.orElseGet(CandidateAssessment::new);
        assessment.setCandidate(candidate);
        assessment.setQuestionsJson(questionsJson);
        assessment.setTimeLimitMinutes(45);

        return candidateAssessmentRepository.save(assessment).getId();
    }
}
