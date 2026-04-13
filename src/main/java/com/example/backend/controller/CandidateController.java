package com.example.backend.controller;

import com.example.backend.model.CandidateApplication;
import com.example.backend.repository.CandidateApplicationRepository;
import com.example.backend.service.S3Service;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/candidates")
@PreAuthorize("hasAnyRole('HR', 'PRACTICE')")
public class CandidateController {

    private final CandidateApplicationRepository candidateRepo;
    private final S3Service s3Service;

    public CandidateController(CandidateApplicationRepository candidateRepo, S3Service s3Service) {
        this.candidateRepo = candidateRepo;
        this.s3Service = s3Service;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listCandidates() {
        List<CandidateApplication> candidates = candidateRepo.findAll();
        List<Map<String, Object>> result = candidates.stream().map(c -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", c.getId());
            map.put("firstName", c.getFirstName());
            map.put("middleName", c.getMiddleName());
            map.put("lastName", c.getLastName());
            map.put("email", c.getEmail());
            map.put("createdAt", c.getCreatedAt());
            map.put("hasPhoto", c.getPhotoS3Key() != null);
            map.put("hasVideo", c.getVideoS3Key() != null);
            map.put("techStacks", c.getTechStacks().stream()
                .map(ts -> ts.getName())
                .collect(Collectors.toList()));
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCandidateDetail(@PathVariable Long id) {
        Optional<CandidateApplication> opt = candidateRepo.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        CandidateApplication c = opt.get();

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", c.getId());
        map.put("firstName", c.getFirstName());
        map.put("middleName", c.getMiddleName());
        map.put("lastName", c.getLastName());
        map.put("email", c.getEmail());
        map.put("currentAddress", c.getCurrentAddress());
        map.put("permanentAddress", c.getPermanentAddress());
        map.put("workExperience", c.getWorkExperience());
        map.put("firstJobDate", c.getFirstJobDate());
        map.put("lastWorkingDay", c.getLastWorkingDay());
        map.put("lastCompanySalary", c.getLastCompanySalary());
        map.put("createdAt", c.getCreatedAt());
        map.put("techStacks", c.getTechStacks().stream()
            .map(ts -> {
                Map<String, Object> tsMap = new LinkedHashMap<>();
                tsMap.put("id", ts.getId());
                tsMap.put("name", ts.getName());
                tsMap.put("category", ts.getCategory());
                return tsMap;
            })
            .collect(Collectors.toList()));

        // Generate presigned URLs for S3 objects
        if (c.getAadhaarS3Key() != null) {
            map.put("aadhaarUrl", s3Service.generatePresignedUrl(c.getAadhaarS3Key()));
        }
        if (c.getPancardS3Key() != null) {
            map.put("pancardUrl", s3Service.generatePresignedUrl(c.getPancardS3Key()));
        }
        if (c.getPhotoS3Key() != null) {
            map.put("photoUrl", s3Service.generatePresignedUrl(c.getPhotoS3Key()));
        }
        if (c.getVideoS3Key() != null) {
            map.put("videoUrl", s3Service.generatePresignedUrl(c.getVideoS3Key()));
        }

        return ResponseEntity.ok(map);
    }
}
