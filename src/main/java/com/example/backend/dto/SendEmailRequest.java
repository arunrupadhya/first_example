package com.example.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class SendEmailRequest {

    private Long candidateId;

    @NotBlank(message = "Candidate email is required")
    @Email(message = "Invalid email format")
    private String candidateEmail;

    @NotEmpty(message = "At least one tech stack must be selected")
    private List<String> techStacks;

    @NotBlank(message = "Subject is required")
    private String subject;

    @NotBlank(message = "Mail content is required")
    private String content;

    private Boolean includeOnlineExam = false;

    public Long getCandidateId() {
        return candidateId;
    }

    public void setCandidateId(Long candidateId) {
        this.candidateId = candidateId;
    }

    public String getCandidateEmail() {
        return candidateEmail;
    }

    public void setCandidateEmail(String candidateEmail) {
        this.candidateEmail = candidateEmail;
    }

    public List<String> getTechStacks() {
        return techStacks;
    }

    public void setTechStacks(List<String> techStacks) {
        this.techStacks = techStacks;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Boolean getIncludeOnlineExam() {
        return includeOnlineExam;
    }

    public void setIncludeOnlineExam(Boolean includeOnlineExam) {
        this.includeOnlineExam = includeOnlineExam;
    }
}
