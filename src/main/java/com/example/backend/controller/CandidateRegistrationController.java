package com.example.backend.controller;

import com.example.backend.dto.CandidateRegistrationResponse;
import com.example.backend.model.CandidateApplication;
import com.example.backend.model.TechStack;
import com.example.backend.repository.CandidateApplicationRepository;
import com.example.backend.repository.TechStackRepository;
import com.example.backend.service.S3Service;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/candidate-registration")
public class CandidateRegistrationController {

    private final CandidateApplicationRepository candidateRepo;
    private final TechStackRepository techStackRepo;
    private final S3Service s3Service;

    public CandidateRegistrationController(CandidateApplicationRepository candidateRepo,
                                           TechStackRepository techStackRepo,
                                           S3Service s3Service) {
        this.candidateRepo = candidateRepo;
        this.techStackRepo = techStackRepo;
        this.s3Service = s3Service;
    }

    @GetMapping("/tech-stacks")
    public ResponseEntity<List<TechStack>> getTechStacks() {
        return ResponseEntity.ok(techStackRepo.findAllByOrderByCategoryAscNameAsc());
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestParam("firstName") String firstName,
            @RequestParam(value = "middleName", required = false) String middleName,
            @RequestParam("lastName") String lastName,
            @RequestParam("email") String email,
            @RequestParam("currentAddress") String currentAddress,
            @RequestParam("permanentAddress") String permanentAddress,
            @RequestParam("techStackIds") List<Long> techStackIds,
            @RequestParam(value = "workExperience", required = false) String workExperience,
            @RequestParam(value = "firstJobDate", required = false) String firstJobDate,
            @RequestParam(value = "lastWorkingDay", required = false) String lastWorkingDay,
            @RequestParam(value = "lastCompanySalary", required = false) BigDecimal lastCompanySalary,
            @RequestParam("aadhaarFile") MultipartFile aadhaarFile,
            @RequestParam("pancardFile") MultipartFile pancardFile) {

        if (firstName == null || firstName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "First name is required"));
        }
        if (lastName == null || lastName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Last name is required"));
        }
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        if (techStackIds == null || techStackIds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "At least one tech stack is required"));
        }
        if (aadhaarFile.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Aadhaar card file is required"));
        }
        if (pancardFile.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "PAN card file is required"));
        }

        CandidateApplication candidate = new CandidateApplication();
        candidate.setFirstName(firstName.trim());
        candidate.setMiddleName(middleName != null ? middleName.trim() : null);
        candidate.setLastName(lastName.trim());
        candidate.setEmail(email.trim());
        candidate.setCurrentAddress(currentAddress.trim());
        candidate.setPermanentAddress(permanentAddress.trim());
        candidate.setWorkExperience(workExperience);

        if (firstJobDate != null && !firstJobDate.isBlank()) {
            candidate.setFirstJobDate(LocalDate.parse(firstJobDate));
        }
        if (lastWorkingDay != null && !lastWorkingDay.isBlank()) {
            candidate.setLastWorkingDay(LocalDate.parse(lastWorkingDay));
        }
        candidate.setLastCompanySalary(lastCompanySalary);

        Set<TechStack> techStacks = new HashSet<>(techStackRepo.findAllById(techStackIds));
        candidate.setTechStacks(techStacks);

        // Save first to get ID for S3 keys
        candidate = candidateRepo.save(candidate);

        try {
            // Upload Aadhaar
            String aadhaarKey = s3Service.buildDocumentKey(candidate.getId(), "aadhaar",
                    Objects.requireNonNull(aadhaarFile.getOriginalFilename()));
            s3Service.uploadFile(aadhaarKey, aadhaarFile.getBytes(), aadhaarFile.getContentType());
            candidate.setAadhaarS3Key(aadhaarKey);

            // Upload PAN card
            String pancardKey = s3Service.buildDocumentKey(candidate.getId(), "pancard",
                    Objects.requireNonNull(pancardFile.getOriginalFilename()));
            s3Service.uploadFile(pancardKey, pancardFile.getBytes(), pancardFile.getContentType());
            candidate.setPancardS3Key(pancardKey);

            candidate = candidateRepo.save(candidate);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload documents"));
        }

        CandidateRegistrationResponse response = new CandidateRegistrationResponse();
        response.setId(candidate.getId());
        response.setFirstName(candidate.getFirstName());
        response.setMiddleName(candidate.getMiddleName());
        response.setLastName(candidate.getLastName());
        response.setEmail(candidate.getEmail());
        response.setCurrentAddress(candidate.getCurrentAddress());
        response.setPermanentAddress(candidate.getPermanentAddress());
        response.setWorkExperience(candidate.getWorkExperience());
        response.setFirstJobDate(candidate.getFirstJobDate());
        response.setLastWorkingDay(candidate.getLastWorkingDay());
        response.setLastCompanySalary(candidate.getLastCompanySalary());
        response.setTechStacks(techStacks.stream().map(TechStack::getName).collect(Collectors.toList()));
        response.setMessage("Registration successful");

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/photo")
    public ResponseEntity<?> uploadPhoto(@PathVariable Long id,
                                         @RequestParam("file") MultipartFile file) {
        CandidateApplication candidate = candidateRepo.findById(id).orElse(null);
        if (candidate == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Candidate not found"));
        }
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file provided"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "File must be an image"));
        }

        try {
            String key = s3Service.buildCandidatePhotoKey(candidate.getId());
            s3Service.uploadFile(key, file.getBytes(), contentType);
            candidate.setPhotoS3Key(key);
            candidateRepo.save(candidate);
            return ResponseEntity.ok(Map.of("message", "Photo uploaded successfully", "candidateId", id));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload photo"));
        }
    }

    @PostMapping("/{id}/video")
    public ResponseEntity<?> uploadVideo(@PathVariable Long id,
                                         @RequestParam("file") MultipartFile file) {
        CandidateApplication candidate = candidateRepo.findById(id).orElse(null);
        if (candidate == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Candidate not found"));
        }
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file provided"));
        }

        try {
            String key = s3Service.buildCandidateVideoKey(candidate.getId());
            s3Service.uploadFile(key, file.getBytes(), file.getContentType());
            candidate.setVideoS3Key(key);
            candidateRepo.save(candidate);
            return ResponseEntity.ok(Map.of("message", "Video uploaded successfully", "candidateId", id));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload video"));
        }
    }
}
