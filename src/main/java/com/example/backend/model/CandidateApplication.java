package com.example.backend.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "candidate_applications")
public class CandidateApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "middle_name", length = 100)
    private String middleName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(nullable = false)
    private String email;

    @Column(name = "current_address", nullable = false, columnDefinition = "TEXT")
    private String currentAddress;

    @Column(name = "permanent_address", nullable = false, columnDefinition = "TEXT")
    private String permanentAddress;

    @Column(name = "aadhaar_s3_key", length = 500)
    private String aadhaarS3Key;

    @Column(name = "pancard_s3_key", length = 500)
    private String pancardS3Key;

    @Column(name = "work_experience", columnDefinition = "TEXT")
    private String workExperience;

    @Column(name = "first_job_date")
    private LocalDate firstJobDate;

    @Column(name = "last_working_day")
    private LocalDate lastWorkingDay;

    @Column(name = "last_company_salary", precision = 15, scale = 2)
    private BigDecimal lastCompanySalary;

    @Column(name = "photo_s3_key", length = 500)
    private String photoS3Key;

    @Column(name = "video_s3_key", length = 500)
    private String videoS3Key;

    @Column(name = "selection_status", length = 20)
    private String selectionStatus = "PENDING";

    @Column(name = "selection_notes", columnDefinition = "TEXT")
    private String selectionNotes;

    @Column(name = "selected_by", length = 50)
    private String selectedBy;

    @Column(name = "selected_at")
    private Instant selectedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "candidate_tech_stacks",
        joinColumns = @JoinColumn(name = "candidate_id"),
        inverseJoinColumns = @JoinColumn(name = "tech_stack_id")
    )
    private Set<TechStack> techStacks = new HashSet<>();

    public CandidateApplication() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getMiddleName() { return middleName; }
    public void setMiddleName(String middleName) { this.middleName = middleName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getCurrentAddress() { return currentAddress; }
    public void setCurrentAddress(String currentAddress) { this.currentAddress = currentAddress; }

    public String getPermanentAddress() { return permanentAddress; }
    public void setPermanentAddress(String permanentAddress) { this.permanentAddress = permanentAddress; }

    public String getAadhaarS3Key() { return aadhaarS3Key; }
    public void setAadhaarS3Key(String aadhaarS3Key) { this.aadhaarS3Key = aadhaarS3Key; }

    public String getPancardS3Key() { return pancardS3Key; }
    public void setPancardS3Key(String pancardS3Key) { this.pancardS3Key = pancardS3Key; }

    public String getWorkExperience() { return workExperience; }
    public void setWorkExperience(String workExperience) { this.workExperience = workExperience; }

    public LocalDate getFirstJobDate() { return firstJobDate; }
    public void setFirstJobDate(LocalDate firstJobDate) { this.firstJobDate = firstJobDate; }

    public LocalDate getLastWorkingDay() { return lastWorkingDay; }
    public void setLastWorkingDay(LocalDate lastWorkingDay) { this.lastWorkingDay = lastWorkingDay; }

    public BigDecimal getLastCompanySalary() { return lastCompanySalary; }
    public void setLastCompanySalary(BigDecimal lastCompanySalary) { this.lastCompanySalary = lastCompanySalary; }

    public String getPhotoS3Key() { return photoS3Key; }
    public void setPhotoS3Key(String photoS3Key) { this.photoS3Key = photoS3Key; }

    public String getVideoS3Key() { return videoS3Key; }
    public void setVideoS3Key(String videoS3Key) { this.videoS3Key = videoS3Key; }

    public Instant getCreatedAt() { return createdAt; }

    public String getSelectionStatus() { return selectionStatus; }
    public void setSelectionStatus(String selectionStatus) { this.selectionStatus = selectionStatus; }

    public String getSelectionNotes() { return selectionNotes; }
    public void setSelectionNotes(String selectionNotes) { this.selectionNotes = selectionNotes; }

    public String getSelectedBy() { return selectedBy; }
    public void setSelectedBy(String selectedBy) { this.selectedBy = selectedBy; }

    public Instant getSelectedAt() { return selectedAt; }
    public void setSelectedAt(Instant selectedAt) { this.selectedAt = selectedAt; }

    public Set<TechStack> getTechStacks() { return techStacks; }
    public void setTechStacks(Set<TechStack> techStacks) { this.techStacks = techStacks; }
}
