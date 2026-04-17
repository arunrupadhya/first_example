package com.example.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AIAgentService {

    private static final Logger log = LoggerFactory.getLogger(AIAgentService.class);

    @Value("${local.ai.provider:ollama}")
    private String provider;

    @Value("${local.ai.base-url:http://localhost:11434}")
    private String baseUrl;

    @Value("${local.ai.model:llama3.1}")
    private String modelName;

    @Value("${local.ai.timeout-seconds:60}")
    private int timeoutSeconds;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public AIAgentService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    /**
     * Generate the next interview verification question based on previous Q&A history.
     */
    public String generateNextQuestion(String candidateName, List<String> techStacks,
                                       List<Map<String, String>> previousQA) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an expert technical interviewer. Generate ONE follow-up interview question ");
        prompt.append("for the candidate based on their previous answers.\n\n");
        prompt.append("Candidate: ").append(candidateName).append("\n");
        prompt.append("Tech Stacks: ").append(String.join(", ", techStacks)).append("\n\n");

        if (previousQA != null && !previousQA.isEmpty()) {
            prompt.append("Previous Q&A:\n");
            for (Map<String, String> qa : previousQA) {
                prompt.append("Q: ").append(qa.get("question")).append("\n");
                prompt.append("A: ").append(qa.getOrDefault("answer", "(no answer recorded)")).append("\n\n");
            }
            prompt.append("Based on the candidate's last answer, generate a relevant follow-up question ");
            prompt.append("that digs deeper into their claimed experience or tests their knowledge.\n");
        } else {
            prompt.append("This is the first verification round. Ask the candidate to state their full name ");
            prompt.append("and describe their experience with their primary tech stack.\n");
        }

        prompt.append("\nRespond with ONLY the question text, no numbering, no prefix.");
        String aiResponse = invokeModel(prompt.toString());
        if (isUsableTextResponse(aiResponse)) {
            return aiResponse.trim();
        }
        return buildFallbackNextQuestion(techStacks);
    }

    /**
     * Generate assessment questions: 20 objective (MCQ) + 5 coding questions.
     * Returns JSON string with the questions.
     */
    public String generateAssessmentQuestions(String candidateName, List<String> techStacks,
                                              String workExperience) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an expert technical interviewer. Generate an assessment with exactly ");
        prompt.append("25 questions for a candidate interview.\n\n");
        prompt.append("Candidate: ").append(candidateName).append("\n");
        prompt.append("Tech Stacks: ").append(String.join(", ", techStacks)).append("\n");
        if (workExperience != null) {
            prompt.append("Experience: ").append(workExperience).append("\n");
        }
        prompt.append("\nGenerate:\n");
        prompt.append("- 20 objective/MCQ questions (each with 4 options labeled A, B, C, D and one correct answer)\n");
        prompt.append("- 5 coding questions (each with a problem statement, expected input/output example, ");
        prompt.append("and the correct solution approach)\n\n");
        prompt.append("The questions should cover the candidate's tech stacks proportionally.\n");
        prompt.append("Difficulty: mix of easy (30%), medium (50%), hard (20%).\n\n");
        prompt.append("Respond with ONLY valid JSON and no markdown fences.");

        String aiResponse = invokeModel(prompt.toString());
        if (isLikelyJson(aiResponse)) {
            return aiResponse;
        }
        return buildFallbackAssessmentQuestions(techStacks);
    }

    /**
     * Evaluate candidate's answers using AI. Returns detailed evaluation JSON.
     */
    public String evaluateAssessmentAnswers(String questionsJson, Map<Integer, String> candidateAnswers) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an expert technical evaluator. Evaluate the candidate's answers ");
        prompt.append("against the correct answers.\n\n");
        prompt.append("Questions and correct answers:\n");
        prompt.append(questionsJson).append("\n\n");
        prompt.append("Candidate's answers:\n");
        for (Map.Entry<Integer, String> entry : candidateAnswers.entrySet()) {
            prompt.append("Question ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
        }
        prompt.append("\nReturn valid JSON with score, grade, strengths, weaknesses, recommendation, and per-question feedback only.");

        String aiResponse = invokeModel(prompt.toString());
        if (isLikelyJson(aiResponse)) {
            return aiResponse;
        }
        return buildFallbackEvaluationJson(questionsJson, candidateAnswers);
    }

    /**
     * Perform comprehensive identity analysis using AI - combining face, video, and audio signals.
     */
    public String analyzeIdentityVerification(double faceMatchConfidence, String faceMatchResult,
                                              boolean hasVideoMatch, boolean hasAudioMatch,
                                              String candidateName) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an AI identity verification analyst. Provide a concise risk review for candidate ")
                .append(candidateName).append(".\n\n")
                .append("Photo match result: ").append(faceMatchResult).append("\n")
                .append("Photo confidence: ").append(String.format("%.2f%%", faceMatchConfidence)).append("\n")
                .append("Video consistency: ").append(hasVideoMatch ? "match detected" : "no reliable match").append("\n")
                .append("Audio signal: ").append(hasAudioMatch ? "present" : "absent or unclear").append("\n\n")
                .append("Return plain text with overall verdict, risk, and HR recommendation.");

        String aiResponse = invokeModel(prompt.toString());
        if (isUsableTextResponse(aiResponse)) {
            return aiResponse;
        }
        return buildFallbackIdentityAnalysis(faceMatchConfidence, faceMatchResult, hasVideoMatch, hasAudioMatch, candidateName);
    }

    private boolean isUsableTextResponse(String response) {
        return response != null
                && !response.isBlank()
                && !response.startsWith("AI service unavailable:");
    }

    private boolean isLikelyJson(String response) {
        if (!isUsableTextResponse(response)) {
            return false;
        }
        String json = response.trim();
        if (json.startsWith("```")) {
            json = json.replaceAll("^```[a-zA-Z]*\\n?", "").replaceAll("\\n?```$", "").trim();
        }
        return json.startsWith("{") && json.endsWith("}");
    }

    private String buildFallbackNextQuestion(List<String> techStacks) {
        String primaryTech = (techStacks != null && !techStacks.isEmpty()) ? techStacks.get(0) : "your primary technology";
        return "Please explain a recent project where you used " + primaryTech + " and describe your exact contribution and challenges.";
    }

    private String buildFallbackIdentityAnalysis(double faceMatchConfidence, String faceMatchResult,
                                                 boolean hasVideoMatch, boolean hasAudioMatch,
                                                 String candidateName) {
        String verdict;
        String risk;
        String recommendation;

        if ("MATCH".equalsIgnoreCase(faceMatchResult) && hasVideoMatch && hasAudioMatch) {
            verdict = "VERIFIED";
            risk = "Low risk";
            recommendation = "Candidate can proceed to the next round.";
        } else if ("MATCH".equalsIgnoreCase(faceMatchResult)) {
            verdict = "VERIFIED";
            risk = "Moderate risk";
            recommendation = "Proceed, but review the recording manually if needed.";
        } else if ("MISMATCH".equalsIgnoreCase(faceMatchResult)) {
            verdict = "FAILED";
            risk = "High risk";
            recommendation = "Do not proceed without HR review.";
        } else {
            verdict = "SUSPICIOUS";
            risk = "Moderate risk";
            recommendation = "Retry or perform manual verification.";
        }

        return "Overall verdict: " + verdict + "\n"
                + "Candidate: " + candidateName + "\n"
                + "Confidence: " + String.format("%.1f%%", faceMatchConfidence) + "\n"
                + "Photo match: " + faceMatchResult + "\n"
                + "Video signal: " + (hasVideoMatch ? "Match detected" : "No reliable video match") + "\n"
                + "Audio signal: " + (hasAudioMatch ? "Audio present" : "Audio absent or unclear") + "\n"
                + "Risk assessment: " + risk + "\n"
                + "Recommendation: " + recommendation;
    }

    private String buildFallbackAssessmentQuestions(List<String> techStacks) {
        try {
            String primaryTech = (techStacks != null && !techStacks.isEmpty()) ? techStacks.get(0) : "Java";
            ObjectNode root = objectMapper.createObjectNode();
            ArrayNode objective = root.putArray("objective");
            ArrayNode coding = root.putArray("coding");

            addObjectiveQuestion(objective, 1, "Which HTTP method is typically used to fetch data in a REST API?", "POST", "GET", "PUT", "DELETE", "B", "easy", "Web");
            addObjectiveQuestion(objective, 2, "What does dependency injection improve most in an application?", "Tight coupling", "Testability and maintainability", "File size", "Network speed", "B", "easy", "Architecture");
            addObjectiveQuestion(objective, 3, "Which collection usually provides constant-time key lookup?", "List", "Queue", "HashMap", "Stack", "C", "easy", "Collections");
            addObjectiveQuestion(objective, 4, "What status code usually means resource created successfully?", "200", "201", "400", "500", "B", "easy", "HTTP");
            addObjectiveQuestion(objective, 5, "Which SQL clause is used to filter rows?", "ORDER BY", "GROUP BY", "WHERE", "LIMIT", "C", "easy", "SQL");
            addObjectiveQuestion(objective, 6, "In Spring Boot, which annotation marks a REST controller?", "@ControllerAdvice", "@RestController", "@Service", "@Repository", "B", "easy", "Spring");
            addObjectiveQuestion(objective, 7, "What is the main purpose of unit tests?", "Deploy code", "Check UI colors", "Verify isolated behavior", "Create database tables", "C", "easy", "Testing");
            addObjectiveQuestion(objective, 8, "What does JWT usually store?", "Compiled bytecode", "Authentication claims", "Image metadata only", "CSS rules", "B", "medium", "Security");
            addObjectiveQuestion(objective, 9, "Which keyword is commonly used to handle exceptions in Java?", "catch", "guard", "throwable", "error", "A", "easy", "Java");
            addObjectiveQuestion(objective, 10, "Why are database indexes useful?", "They encrypt data", "They speed up lookups", "They replace tables", "They remove nulls", "B", "medium", "Database");
            addObjectiveQuestion(objective, 11, "Which principle suggests a class should have one reason to change?", "DRY", "SRP", "YAGNI", "KISS", "B", "medium", "Design");
            addObjectiveQuestion(objective, 12, "What is a transaction mainly used for?", "Styling pages", "Grouping operations atomically", "Sending email", "Generating PDFs", "B", "medium", "Database");
            addObjectiveQuestion(objective, 13, "Which layer should contain business rules in a Spring application?", "Controller", "Service", "DTO", "Static assets", "B", "medium", "Architecture");
            addObjectiveQuestion(objective, 14, "What is the benefit of pagination in APIs?", "Larger payloads", "Reduced memory and network usage", "No authentication needed", "Automatic caching only", "B", "medium", "API");
            addObjectiveQuestion(objective, 15, "What is the safest way to store passwords?", "Plain text", "Base64", "Hashed with a strong algorithm", "In cookies only", "C", "medium", "Security");
            addObjectiveQuestion(objective, 16, "Which statement best describes asynchronous processing?", "Tasks always run sequentially", "Work can continue without blocking for completion", "It removes validation", "It replaces databases", "B", "medium", "Concurrency");
            addObjectiveQuestion(objective, 17, "What does a 401 response usually indicate?", "Unauthorized request", "Resource created", "Server crash", "Data cached", "A", "medium", "HTTP");
            addObjectiveQuestion(objective, 18, "What is version control mainly used for?", "Running SQL", "Tracking and managing code changes", "Compressing videos", "Monitoring CPU temperature", "B", "easy", "Git");
            addObjectiveQuestion(objective, 19, "Which practice helps prevent SQL injection?", "String concatenation", "Prepared statements", "Disabling logging", "Using GET requests", "B", "hard", "Security");
            addObjectiveQuestion(objective, 20, "Which option best improves code readability long term?", "More duplication", "Clear naming and small functions", "Longer files", "Hidden logic", "B", "easy", "Clean Code");

            addCodingQuestion(coding, 21, "Write a function in " + primaryTech + " to reverse a string.", "hello", "olleh", "Use a loop, built-in reverse utility, or two-pointer approach to return the reversed string.", "easy", primaryTech);
            addCodingQuestion(coding, 22, "Write a program to count the frequency of each word in a sentence.", "hi hi java", "hi=2, java=1", "Split the sentence, normalize words, then use a map/dictionary to count occurrences.", "medium", "Collections");
            addCodingQuestion(coding, 23, "Design an API endpoint to fetch paginated candidate records.", "page=0,size=10", "10 records + total count", "Accept page and size parameters, validate them, query the database efficiently, and return structured JSON.", "medium", "API Design");
            addCodingQuestion(coding, 24, "Write a query or method to find duplicate email addresses in a candidate table.", "candidate_applications", "duplicate emails list", "Use GROUP BY email with HAVING COUNT(*) > 1, or equivalent repository logic.", "medium", "SQL");
            addCodingQuestion(coding, 25, "Implement role-based authorization for an admin-only action.", "ADMIN role", "access allowed for admins only", "Validate the authenticated user's role and deny access for unauthorized roles.", "hard", "Security");

            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            log.error("Failed to build fallback assessment questions", e);
            return "{\"objective\":[],\"coding\":[]}";
        }
    }

    private void addObjectiveQuestion(ArrayNode objective, int id, String question,
                                      String optionA, String optionB, String optionC, String optionD,
                                      String correctAnswer, String difficulty, String topic) {
        ObjectNode node = objective.addObject();
        node.put("id", id);
        node.put("question", question);
        ObjectNode options = node.putObject("options");
        options.put("A", optionA);
        options.put("B", optionB);
        options.put("C", optionC);
        options.put("D", optionD);
        node.put("correctAnswer", correctAnswer);
        node.put("difficulty", difficulty);
        node.put("topic", topic);
    }

    private void addCodingQuestion(ArrayNode coding, int id, String question,
                                   String exampleInput, String exampleOutput,
                                   String correctApproach, String difficulty, String topic) {
        ObjectNode node = coding.addObject();
        node.put("id", id);
        node.put("question", question);
        node.put("exampleInput", exampleInput);
        node.put("exampleOutput", exampleOutput);
        node.put("correctApproach", correctApproach);
        node.put("difficulty", difficulty);
        node.put("topic", topic);
    }

    private String buildFallbackEvaluationJson(String questionsJson, Map<Integer, String> candidateAnswers) {
        try {
            JsonNode root = objectMapper.readTree(questionsJson);
            ArrayNode results = objectMapper.createArrayNode();

            int objectiveScore = 0;
            int codingScore = 0;
            int objectiveMax = 20;
            int codingMax = 80;

            JsonNode objectiveQuestions = root.path("objective");
            if (objectiveQuestions.isArray()) {
                objectiveMax = objectiveQuestions.size();
                for (JsonNode q : objectiveQuestions) {
                    int id = q.path("id").asInt();
                    String correct = q.path("correctAnswer").asText();
                    String answer = candidateAnswers.getOrDefault(id, "");
                    boolean isCorrect = correct.equalsIgnoreCase(answer.trim());
                    if (isCorrect) {
                        objectiveScore += 1;
                    }

                    ObjectNode result = results.addObject();
                    result.put("questionId", id);
                    result.put("type", "objective");
                    result.put("correct", isCorrect);
                    result.put("score", isCorrect ? 1 : 0);
                    result.put("maxScore", 1);
                    result.put("feedback", isCorrect ? "Correct answer." : "Expected answer: " + correct);
                }
            }

            JsonNode codingQuestions = root.path("coding");
            if (codingQuestions.isArray() && codingQuestions.size() > 0) {
                codingMax = codingQuestions.size() * 16;
                for (JsonNode q : codingQuestions) {
                    int id = q.path("id").asInt();
                    String answer = candidateAnswers.getOrDefault(id, "").trim();
                    int score = estimateCodingScore(answer);
                    codingScore += score;

                    ObjectNode result = results.addObject();
                    result.put("questionId", id);
                    result.put("type", "coding");
                    result.put("correct", score >= 10);
                    result.put("score", score);
                    result.put("maxScore", 16);
                    result.put("feedback", answer.isBlank()
                            ? "No answer submitted."
                            : "Fallback evaluation applied based on completeness and technical structure.");
                }
            }

            int totalScore = objectiveScore + codingScore;
            int maxScore = objectiveMax + codingMax;
            String grade = totalScore >= 85 ? "A" : totalScore >= 70 ? "B" : totalScore >= 55 ? "C" : totalScore >= 40 ? "D" : "F";
            String recommendation = totalScore >= 70 ? "HIRE" : totalScore >= 55 ? "CONSIDER" : "REJECT";

            ObjectNode evaluation = objectMapper.createObjectNode();
            evaluation.put("totalScore", totalScore);
            evaluation.put("maxScore", maxScore);
            evaluation.put("objectiveScore", objectiveScore);
            evaluation.put("objectiveMax", objectiveMax);
            evaluation.put("codingScore", codingScore);
            evaluation.put("codingMax", codingMax);
            evaluation.put("grade", grade);
            evaluation.put("summary", "Automatic fallback evaluation was used because the external AI service was unavailable.");
            ArrayNode strengths = evaluation.putArray("strengths");
            strengths.add("Assessment was completed successfully in local fallback mode.");
            if (objectiveScore > 0) strengths.add("Candidate answered some objective questions correctly.");
            ArrayNode weaknesses = evaluation.putArray("weaknesses");
            if (objectiveScore < objectiveMax / 2) weaknesses.add("Objective accuracy needs improvement.");
            if (codingScore < codingMax / 2) weaknesses.add("Coding answers need more depth or completeness.");
            evaluation.put("recommendation", recommendation);
            evaluation.set("questionResults", results);

            return objectMapper.writeValueAsString(evaluation);
        } catch (Exception e) {
            log.error("Failed to build fallback evaluation JSON", e);
            return "{\"totalScore\":0,\"maxScore\":100,\"objectiveScore\":0,\"objectiveMax\":20,\"codingScore\":0,\"codingMax\":80,\"grade\":\"F\",\"summary\":\"Fallback evaluation failed.\",\"strengths\":[],\"weaknesses\":[\"Evaluation unavailable\"],\"recommendation\":\"REJECT\",\"questionResults\":[]}";
        }
    }

    private int estimateCodingScore(String answer) {
        if (answer == null || answer.isBlank()) {
            return 0;
        }
        int score = 4;
        if (answer.length() > 40) score += 4;
        if (answer.length() > 120) score += 4;
        String lower = answer.toLowerCase(Locale.ROOT);
        if (lower.contains("for") || lower.contains("while") || lower.contains("if") || lower.contains("select") || lower.contains("map")) {
            score += 4;
        }
        return Math.min(score, 16);
    }

    private String invokeModel(String prompt) {
        if (!"ollama".equalsIgnoreCase(provider)) {
            log.warn("Unsupported local AI provider '{}', using fallback mode.", provider);
            return "AI service unavailable: Unsupported local AI provider.";
        }

        try {
            String normalizedBaseUrl = baseUrl.endsWith("/")
                    ? baseUrl.substring(0, baseUrl.length() - 1)
                    : baseUrl;

            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("model", modelName);
            requestBody.put("prompt", prompt);
            requestBody.put("stream", false);
            requestBody.put("temperature", 0.3);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(normalizedBaseUrl + "/api/generate"))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(Math.max(timeoutSeconds, 10)))
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Local AI service returned status {}", response.statusCode());
                return "AI service unavailable: Local model returned status " + response.statusCode();
            }

            JsonNode responseNode = objectMapper.readTree(response.body());
            String text = responseNode.path("response").asText("");
            if (!text.isBlank()) {
                return text.trim();
            }
            return responseNode.toString();

        } catch (Exception e) {
            log.error("Failed to invoke local AI model: {}", e.getMessage(), e);
            return "AI service unavailable: " + e.getMessage();
        }
    }

    /**
     * Parse questions JSON from AI response, handling potential markdown wrapping.
     */
    public Map<String, Object> parseQuestionsJson(String aiResponse) {
        try {
            String json = aiResponse.trim();
            if (json.startsWith("```")) {
                json = json.replaceAll("^```[a-z]*\\n?", "").replaceAll("\\n?```$", "").trim();
            }
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("Failed to parse AI questions JSON: {}", e.getMessage());
            return Map.of("error", "Failed to parse AI response", "raw", aiResponse);
        }
    }

    /**
     * Parse evaluation JSON from AI response.
     */
    public Map<String, Object> parseEvaluationJson(String aiResponse) {
        try {
            String json = aiResponse.trim();
            if (json.startsWith("```")) {
                json = json.replaceAll("^```[a-z]*\\n?", "").replaceAll("\\n?```$", "").trim();
            }
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("Failed to parse AI evaluation JSON: {}", e.getMessage());
            return Map.of("error", "Failed to parse AI evaluation", "raw", aiResponse);
        }
    }
}
