package com.example.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class CandidateRegistrationResponse {

    private Long id;
    private String firstName;
    private String middleName;
    private String lastName;
    private String email;
    private String currentAddress;
    private String permanentAddress;
    private String workExperience;
    private LocalDate firstJobDate;
    private LocalDate lastWorkingDay;
    private BigDecimal lastCompanySalary;
    private List<String> techStacks;
    private String message;

    public CandidateRegistrationResponse() {}

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

    public String getWorkExperience() { return workExperience; }
    public void setWorkExperience(String workExperience) { this.workExperience = workExperience; }

    public LocalDate getFirstJobDate() { return firstJobDate; }
    public void setFirstJobDate(LocalDate firstJobDate) { this.firstJobDate = firstJobDate; }

    public LocalDate getLastWorkingDay() { return lastWorkingDay; }
    public void setLastWorkingDay(LocalDate lastWorkingDay) { this.lastWorkingDay = lastWorkingDay; }

    public BigDecimal getLastCompanySalary() { return lastCompanySalary; }
    public void setLastCompanySalary(BigDecimal lastCompanySalary) { this.lastCompanySalary = lastCompanySalary; }

    public List<String> getTechStacks() { return techStacks; }
    public void setTechStacks(List<String> techStacks) { this.techStacks = techStacks; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
