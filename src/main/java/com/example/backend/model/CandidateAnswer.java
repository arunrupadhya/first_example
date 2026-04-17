package com.example.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "candidate_answers")
public class CandidateAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private CandidateAssessment assessment;

    @Column(name = "question_id", nullable = false)
    private Integer questionId;

    @Column(name = "question_type", length = 20, nullable = false)
    private String questionType; // OBJECTIVE or CODING

    @Column(name = "candidate_answer", columnDefinition = "TEXT")
    private String candidateAnswer;

    public CandidateAnswer() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public CandidateAssessment getAssessment() { return assessment; }
    public void setAssessment(CandidateAssessment assessment) { this.assessment = assessment; }

    public Integer getQuestionId() { return questionId; }
    public void setQuestionId(Integer questionId) { this.questionId = questionId; }

    public String getQuestionType() { return questionType; }
    public void setQuestionType(String questionType) { this.questionType = questionType; }

    public String getCandidateAnswer() { return candidateAnswer; }
    public void setCandidateAnswer(String candidateAnswer) { this.candidateAnswer = candidateAnswer; }
}
