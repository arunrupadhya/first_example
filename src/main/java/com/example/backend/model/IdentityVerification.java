package com.example.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "identity_verifications")
public class IdentityVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private CandidateApplication candidate;

    @Column(name = "round_number", nullable = false)
    private Integer roundNumber;

    @Column(name = "question", columnDefinition = "TEXT", nullable = false)
    private String question;

    @Column(name = "video_s3_key", length = 500)
    private String videoS3Key;

    @Column(name = "snapshot_s3_key", length = 500)
    private String snapshotS3Key;

    @Column(name = "face_match_confidence")
    private Double faceMatchConfidence;

    @Column(name = "face_match_result", length = 20)
    private String faceMatchResult;

    @Column(name = "video_match_result", length = 20)
    private String videoMatchResult;

    @Column(name = "video_match_confidence")
    private Double videoMatchConfidence;

    @Column(name = "audio_present")
    private Boolean audioPresent;

    @Column(name = "overall_result", length = 20)
    private String overallResult;

    @Column(name = "overall_confidence")
    private Double overallConfidence;

    @Column(name = "ai_analysis_details", columnDefinition = "TEXT")
    private String aiAnalysisDetails;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public IdentityVerification() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public CandidateApplication getCandidate() { return candidate; }
    public void setCandidate(CandidateApplication candidate) { this.candidate = candidate; }

    public Integer getRoundNumber() { return roundNumber; }
    public void setRoundNumber(Integer roundNumber) { this.roundNumber = roundNumber; }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public String getVideoS3Key() { return videoS3Key; }
    public void setVideoS3Key(String videoS3Key) { this.videoS3Key = videoS3Key; }

    public String getSnapshotS3Key() { return snapshotS3Key; }
    public void setSnapshotS3Key(String snapshotS3Key) { this.snapshotS3Key = snapshotS3Key; }

    public Double getFaceMatchConfidence() { return faceMatchConfidence; }
    public void setFaceMatchConfidence(Double faceMatchConfidence) { this.faceMatchConfidence = faceMatchConfidence; }

    public String getFaceMatchResult() { return faceMatchResult; }
    public void setFaceMatchResult(String faceMatchResult) { this.faceMatchResult = faceMatchResult; }

    public String getVideoMatchResult() { return videoMatchResult; }
    public void setVideoMatchResult(String videoMatchResult) { this.videoMatchResult = videoMatchResult; }

    public Double getVideoMatchConfidence() { return videoMatchConfidence; }
    public void setVideoMatchConfidence(Double videoMatchConfidence) { this.videoMatchConfidence = videoMatchConfidence; }

    public Boolean getAudioPresent() { return audioPresent; }
    public void setAudioPresent(Boolean audioPresent) { this.audioPresent = audioPresent; }

    public String getOverallResult() { return overallResult; }
    public void setOverallResult(String overallResult) { this.overallResult = overallResult; }

    public Double getOverallConfidence() { return overallConfidence; }
    public void setOverallConfidence(Double overallConfidence) { this.overallConfidence = overallConfidence; }

    public String getAiAnalysisDetails() { return aiAnalysisDetails; }
    public void setAiAnalysisDetails(String aiAnalysisDetails) { this.aiAnalysisDetails = aiAnalysisDetails; }

    public Instant getCreatedAt() { return createdAt; }
}
