package com.example.backend.repository;

import com.example.backend.model.IdentityVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IdentityVerificationRepository extends JpaRepository<IdentityVerification, Long> {

    List<IdentityVerification> findByCandidateIdOrderByRoundNumberDesc(Long candidateId);

    List<IdentityVerification> findByCandidateIdAndRoundNumber(Long candidateId, Integer roundNumber);
}
