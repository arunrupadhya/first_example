package com.example.backend.repository;

import com.example.backend.model.CandidateAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateAssessmentRepository extends JpaRepository<CandidateAssessment, Long> {

    List<CandidateAssessment> findByCandidateIdOrderByCreatedAtDesc(Long candidateId);

    Optional<CandidateAssessment> findTopByCandidateIdOrderByCreatedAtDesc(Long candidateId);
}
