package com.example.backend.repository;

import com.example.backend.model.CandidateAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidateAnswerRepository extends JpaRepository<CandidateAnswer, Long> {

    List<CandidateAnswer> findByAssessmentId(Long assessmentId);
}
