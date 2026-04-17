package com.example.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.rekognition.model.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class IdentityVerificationService {

    private static final Logger log = LoggerFactory.getLogger(IdentityVerificationService.class);

    private static final float FACE_MATCH_THRESHOLD = 80.0f;

    private final RekognitionClient rekognitionClient;

    public IdentityVerificationService(RekognitionClient rekognitionClient) {
        this.rekognitionClient = rekognitionClient;
    }

    /**
     * Compare two face images using AWS Rekognition.
     */
    public Map<String, Object> compareFaces(byte[] sourceImageBytes, byte[] targetImageBytes) {
        Map<String, Object> result = new HashMap<>();

        try {
            Image sourceImage = Image.builder()
                    .bytes(SdkBytes.fromByteArray(sourceImageBytes))
                    .build();
            Image targetImage = Image.builder()
                    .bytes(SdkBytes.fromByteArray(targetImageBytes))
                    .build();

            CompareFacesRequest request = CompareFacesRequest.builder()
                    .sourceImage(sourceImage)
                    .targetImage(targetImage)
                    .similarityThreshold(FACE_MATCH_THRESHOLD)
                    .build();

            CompareFacesResponse response = rekognitionClient.compareFaces(request);

            List<CompareFacesMatch> matches = response.faceMatches();
            List<ComparedFace> unmatchedFaces = response.unmatchedFaces();

            if (!matches.isEmpty()) {
                CompareFacesMatch bestMatch = matches.get(0);
                float similarity = bestMatch.similarity();

                result.put("result", similarity >= FACE_MATCH_THRESHOLD ? "MATCH" : "MISMATCH");
                result.put("confidence", (double) similarity);
                result.put("details", String.format(
                        "Face comparison: Similarity=%.2f%%, Threshold=%.0f%%, "
                                + "Matched=%d, Unmatched=%d.",
                        similarity, FACE_MATCH_THRESHOLD,
                        matches.size(), unmatchedFaces.size()));
            } else {
                result.put("result", unmatchedFaces.isEmpty() ? "NO_FACE" : "MISMATCH");
                result.put("confidence", 0.0);
                result.put("details", unmatchedFaces.isEmpty()
                        ? "No face detected in the verification image."
                        : String.format("Face detected but no match. %d unmatched face(s).",
                        unmatchedFaces.size()));
            }

        } catch (InvalidParameterException e) {
            log.error("Rekognition invalid parameter: {}", e.getMessage());
            result.put("result", "ERROR");
            result.put("confidence", 0.0);
            result.put("details", "Could not process images: " + e.getMessage());
        } catch (ImageTooLargeException e) {
            log.error("Rekognition image too large: {}", e.getMessage());
            result.put("result", "ERROR");
            result.put("confidence", 0.0);
            result.put("details", "Image too large for processing.");
        } catch (RekognitionException e) {
            log.error("Rekognition service error: {}", e.getMessage());
            result.put("result", "ERROR");
            result.put("confidence", 0.0);
            result.put("details", "AI service error: " + e.getMessage());
        }

        return result;
    }

    /**
     * Detect faces in an image — used for video frame validation and liveness check.
     */
    public Map<String, Object> detectFaces(byte[] imageBytes) {
        Map<String, Object> result = new HashMap<>();
        try {
            Image image = Image.builder()
                    .bytes(SdkBytes.fromByteArray(imageBytes))
                    .build();

            DetectFacesRequest request = DetectFacesRequest.builder()
                    .image(image)
                    .attributes(Attribute.ALL)
                    .build();

            DetectFacesResponse response = rekognitionClient.detectFaces(request);
            List<FaceDetail> faceDetails = response.faceDetails();

            result.put("faceCount", faceDetails.size());
            if (!faceDetails.isEmpty()) {
                FaceDetail face = faceDetails.get(0);
                result.put("confidence", (double) face.confidence());
                result.put("eyesOpen", face.eyesOpen() != null && face.eyesOpen().value());
                result.put("mouthOpen", face.mouthOpen() != null && face.mouthOpen().value());
                result.put("details", String.format(
                        "Face detected with %.1f%% confidence. Eyes open: %s, Mouth open: %s",
                        face.confidence(),
                        face.eyesOpen() != null ? face.eyesOpen().value() : "unknown",
                        face.mouthOpen() != null ? face.mouthOpen().value() : "unknown"));
            } else {
                result.put("confidence", 0.0);
                result.put("details", "No face detected in image.");
            }
        } catch (RekognitionException e) {
            log.error("Face detection error: {}", e.getMessage());
            result.put("faceCount", 0);
            result.put("confidence", 0.0);
            result.put("details", "Face detection error: " + e.getMessage());
        }
        return result;
    }

    /**
     * Perform comprehensive multi-factor identity verification:
     * 1. Photo face comparison (Rekognition CompareFaces)
     * 2. Video frame face comparison
     * 3. Audio/voice presence analysis
     */
    public Map<String, Object> performFullVerification(byte[] originalPhoto,
                                                        byte[] verificationSnapshot,
                                                        byte[] videoFrameSnapshot,
                                                        boolean audioPresent) {
        Map<String, Object> fullResult = new HashMap<>();

        // 1. Photo-to-photo face comparison
        log.info("Running photo-to-photo face comparison...");
        Map<String, Object> photoMatch = compareFaces(originalPhoto, verificationSnapshot);
        fullResult.put("photoMatchResult", photoMatch.get("result"));
        fullResult.put("photoMatchConfidence", photoMatch.get("confidence"));
        fullResult.put("photoMatchDetails", photoMatch.get("details"));

        // 2. Video frame face comparison
        boolean videoMatch = false;
        if (videoFrameSnapshot != null && videoFrameSnapshot.length > 0) {
            log.info("Running video frame face comparison...");
            Map<String, Object> videoCompare = compareFaces(originalPhoto, videoFrameSnapshot);
            String videoResult = (String) videoCompare.get("result");
            videoMatch = "MATCH".equals(videoResult);
            fullResult.put("videoMatchResult", videoResult);
            fullResult.put("videoMatchConfidence", videoCompare.get("confidence"));
            fullResult.put("videoMatchDetails", videoCompare.get("details"));

            // Face attribute detection for liveness
            Map<String, Object> faceDetection = detectFaces(videoFrameSnapshot);
            fullResult.put("videoFaceCount", faceDetection.get("faceCount"));
            fullResult.put("videoFaceDetails", faceDetection.get("details"));
            fullResult.put("videoLivenessIndicator",
                    faceDetection.containsKey("mouthOpen") && Boolean.TRUE.equals(faceDetection.get("mouthOpen")));
        } else {
            fullResult.put("videoMatchResult", "SKIPPED");
            fullResult.put("videoMatchConfidence", 0.0);
            fullResult.put("videoMatchDetails", "No video frame available for comparison.");
        }

        // 3. Audio presence analysis
        fullResult.put("audioPresent", audioPresent);
        fullResult.put("audioAnalysis", audioPresent
                ? "Audio detected in verification recording — voice present during response."
                : "No audio detected — candidate may not have spoken during recording.");

        // Overall result: weighted combination
        String photoResult = (String) photoMatch.get("result");
        double photoConfidence = (Double) photoMatch.get("confidence");

        String overallResult;
        double overallConfidence;

        if ("MATCH".equals(photoResult) && videoMatch && audioPresent) {
            overallResult = "MATCH";
            double videoConf = fullResult.containsKey("videoMatchConfidence")
                    ? (Double) fullResult.get("videoMatchConfidence") : 0;
            overallConfidence = (photoConfidence * 0.5) + (videoConf * 0.3) + 20.0;
        } else if ("MATCH".equals(photoResult) && (videoMatch || audioPresent)) {
            overallResult = "MATCH";
            overallConfidence = photoConfidence * 0.7 + (audioPresent ? 15.0 : 0)
                    + (videoMatch ? 15.0 : 0);
        } else if ("MATCH".equals(photoResult)) {
            overallResult = "MATCH";
            overallConfidence = photoConfidence * 0.8;
        } else if ("MISMATCH".equals(photoResult)) {
            overallResult = "MISMATCH";
            overallConfidence = photoConfidence;
        } else {
            overallResult = "ERROR";
            overallConfidence = 0;
        }

        fullResult.put("overallResult", overallResult);
        fullResult.put("overallConfidence", Math.min(overallConfidence, 100.0));

        return fullResult;
    }
}
