package com.example.backend.controller;

import com.example.backend.dto.SendEmailRequest;
import com.example.backend.model.TechStack;
import com.example.backend.repository.TechStackRepository;
import com.example.backend.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/candidate")
public class CandidateEmailController {

    private final TechStackRepository techStackRepository;
    private final EmailService emailService;

    public CandidateEmailController(TechStackRepository techStackRepository, EmailService emailService) {
        this.techStackRepository = techStackRepository;
        this.emailService = emailService;
    }

    @GetMapping("/tech-stacks")
    public ResponseEntity<List<TechStack>> getAllTechStacks() {
        return ResponseEntity.ok(techStackRepository.findAllByOrderByCategoryAscNameAsc());
    }

    @PostMapping("/send-email")
    public ResponseEntity<Map<String, String>> sendCandidateEmail(@Valid @RequestBody SendEmailRequest request) {
        String body = request.getContent()
                + "\n\nTech Stack: " + String.join(", ", request.getTechStacks());

        emailService.sendEmail(request.getCandidateEmail(), request.getSubject(), body);
        return ResponseEntity.ok(Map.of("message", "Email sent successfully to " + request.getCandidateEmail()));
    }
}
