package com.example.backend.repository;

import com.example.backend.model.CandidateApplication;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateApplicationRepository extends JpaRepository<CandidateApplication, Long> {
}
