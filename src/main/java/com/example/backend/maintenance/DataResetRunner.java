package com.example.backend.maintenance;

import com.example.backend.model.CandidateApplication;
import com.example.backend.model.IdentityVerification;
import com.example.backend.model.User;
import com.example.backend.repository.CandidateApplicationRepository;
import com.example.backend.repository.CandidateAssessmentRepository;
import com.example.backend.repository.CandidateAnswerRepository;
import com.example.backend.repository.IdentityVerificationRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.S3Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
@ConditionalOnProperty(name = "app.maintenance.reset", havingValue = "true")
public class DataResetRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataResetRunner.class);
    private static final String TEST_PASSWORD = "Welcome@123";

    private final UserRepository userRepository;
    private final CandidateApplicationRepository candidateApplicationRepository;
    private final IdentityVerificationRepository identityVerificationRepository;
    private final CandidateAssessmentRepository candidateAssessmentRepository;
    private final CandidateAnswerRepository candidateAnswerRepository;
    private final S3Service s3Service;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;
    private final ApplicationContext applicationContext;

    public DataResetRunner(UserRepository userRepository,
                           CandidateApplicationRepository candidateApplicationRepository,
                           IdentityVerificationRepository identityVerificationRepository,
                           CandidateAssessmentRepository candidateAssessmentRepository,
                           CandidateAnswerRepository candidateAnswerRepository,
                           S3Service s3Service,
                           PasswordEncoder passwordEncoder,
                           JdbcTemplate jdbcTemplate,
                           ApplicationContext applicationContext) {
        this.userRepository = userRepository;
        this.candidateApplicationRepository = candidateApplicationRepository;
        this.identityVerificationRepository = identityVerificationRepository;
        this.candidateAssessmentRepository = candidateAssessmentRepository;
        this.candidateAnswerRepository = candidateAnswerRepository;
        this.s3Service = s3Service;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
        this.applicationContext = applicationContext;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("Starting one-time maintenance reset for users, candidates, assessments, and S3 assets");

        int usersBefore = countRows("users");
        int candidatesBefore = countRows("candidate_applications");
        int verificationsBefore = countRows("identity_verifications");
        int assessmentsBefore = countRows("candidate_assessments");
        int answersBefore = countRows("candidate_answers");
        int messagesBefore = countRows("messages");

        Set<String> s3Keys = collectS3Keys();
        log.info("Before reset -> users={}, candidates={}, verifications={}, assessments={}, answers={}, messages={}, s3Keys={}",
                usersBefore, candidatesBefore, verificationsBefore, assessmentsBefore, answersBefore, messagesBefore, s3Keys.size());

        deleteS3Keys(s3Keys);
        truncateBusinessTables();
        seedUsers();

        int usersAfter = countRows("users");
        int candidatesAfter = countRows("candidate_applications");
        int verificationsAfter = countRows("identity_verifications");
        int assessmentsAfter = countRows("candidate_assessments");
        int answersAfter = countRows("candidate_answers");
        int messagesAfter = countRows("messages");

        log.info("After reset -> users={}, candidates={}, verifications={}, assessments={}, answers={}, messages={}",
                usersAfter, candidatesAfter, verificationsAfter, assessmentsAfter, answersAfter, messagesAfter);
        log.info("Seeded test accounts: admin, hr, practice, interviewer. Shared password: {}", TEST_PASSWORD);

        int exitCode = SpringApplication.exit(applicationContext, () -> 0);
        System.exit(exitCode);
    }

    private Set<String> collectS3Keys() {
        Set<String> keys = new LinkedHashSet<>();

        userRepository.findAll().forEach(user -> addKey(keys, user.getPhotoKey()));

        for (CandidateApplication candidate : candidateApplicationRepository.findAll()) {
            addKey(keys, candidate.getAadhaarS3Key());
            addKey(keys, candidate.getPancardS3Key());
            addKey(keys, candidate.getPhotoS3Key());
            addKey(keys, candidate.getVideoS3Key());
        }

        for (IdentityVerification verification : identityVerificationRepository.findAll()) {
            addKey(keys, verification.getVideoS3Key());
            addKey(keys, verification.getSnapshotS3Key());
        }

        return keys;
    }

    private void deleteS3Keys(Set<String> s3Keys) {
        for (String key : s3Keys) {
            try {
                s3Service.deletePhoto(key);
            } catch (Exception ex) {
                log.warn("Unable to delete S3 object {}: {}", key, ex.getMessage());
            }
        }
    }

    private void truncateBusinessTables() {
        jdbcTemplate.execute("""
                TRUNCATE TABLE
                    candidate_answers,
                    candidate_assessments,
                    identity_verifications,
                    candidate_tech_stacks,
                    candidate_applications,
                    messages,
                    users
                RESTART IDENTITY CASCADE
                """);
    }

    private void seedUsers() {
        List<User> users = List.of(
                buildUser("admin", "ADMIN"),
                buildUser("hr", "HR"),
                buildUser("practice", "PRACTICE"),
                buildUser("interviewer", "INTERVIEWER")
        );
        userRepository.saveAll(users);
    }

    private User buildUser(String username, String role) {
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(TEST_PASSWORD));
        user.setRole(role);
        return user;
    }

    private void addKey(Set<String> keys, String key) {
        if (key != null && !key.isBlank()) {
            keys.add(key);
        }
    }

    private int countRows(String tableName) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + tableName, Integer.class);
        return count == null ? 0 : count;
    }
}
