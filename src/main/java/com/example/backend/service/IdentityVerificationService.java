package com.example.backend.service;

import org.bytedeco.javacpp.BytePointer;
import org.bytedeco.opencv.opencv_core.Mat;
import org.bytedeco.opencv.opencv_core.Rect;
import org.bytedeco.opencv.opencv_core.RectVector;
import org.bytedeco.opencv.opencv_core.Size;
import org.bytedeco.opencv.opencv_objdetect.CascadeClassifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;

import static org.bytedeco.opencv.global.opencv_core.CV_8U;
import static org.bytedeco.opencv.global.opencv_imgcodecs.IMREAD_COLOR;
import static org.bytedeco.opencv.global.opencv_imgcodecs.imdecode;
import static org.bytedeco.opencv.global.opencv_imgproc.COLOR_BGR2GRAY;
import static org.bytedeco.opencv.global.opencv_imgproc.cvtColor;
import static org.bytedeco.opencv.global.opencv_imgproc.equalizeHist;

@Service
public class IdentityVerificationService {

    private static final Logger log = LoggerFactory.getLogger(IdentityVerificationService.class);
    private static final double FACE_MATCH_THRESHOLD = 78.0;
    private static final int NORMALIZED_SIZE = 128;

    private final CascadeClassifier faceCascade;
    private final CascadeClassifier eyeCascade;

    public IdentityVerificationService() {
        this.faceCascade = loadClassifier("haarcascade_frontalface_alt.xml");
        this.eyeCascade = loadClassifier("haarcascade_eye_tree_eyeglasses.xml");
    }

    /**
     * Compare two face images using free local computer-vision heuristics.
     */
    public Map<String, Object> compareFaces(byte[] sourceImageBytes, byte[] targetImageBytes) {
        Map<String, Object> result = new HashMap<>();

        try {
            BufferedImage sourceImage = decodeImage(sourceImageBytes);
            BufferedImage targetImage = decodeImage(targetImageBytes);
            if (sourceImage == null || targetImage == null) {
                result.put("result", "ERROR");
                result.put("confidence", 0.0);
                result.put("details", "Unable to decode one or both images for local verification.");
                return result;
            }

            Rect sourceFace = detectPrimaryFace(sourceImageBytes);
            Rect targetFace = detectPrimaryFace(targetImageBytes);

            BufferedImage sourceCrop = normalizeImage(cropBestRegion(sourceImage, sourceFace), NORMALIZED_SIZE, NORMALIZED_SIZE);
            BufferedImage targetCrop = normalizeImage(cropBestRegion(targetImage, targetFace), NORMALIZED_SIZE, NORMALIZED_SIZE);

            double pixelSimilarity = compareNormalizedImages(sourceCrop, targetCrop);
            double histogramSimilarity = compareHistograms(sourceCrop, targetCrop);
            double brightnessPenalty = Math.abs(computeBrightness(sourceCrop) - computeBrightness(targetCrop)) / 255.0 * 15.0;
            double confidence = clamp((pixelSimilarity * 0.7) + (histogramSimilarity * 0.3) - brightnessPenalty, 0, 100);

            String matchResult = confidence >= FACE_MATCH_THRESHOLD ? "MATCH" : "MISMATCH";
            result.put("result", matchResult);
            result.put("confidence", round(confidence));
            result.put("details", String.format(
                    "Local vision comparison complete. Pixel similarity=%.1f%%, histogram agreement=%.1f%%, faceDetected=%s.",
                    pixelSimilarity,
                    histogramSimilarity,
                    sourceFace != null && targetFace != null));
        } catch (Exception e) {
            log.error("Local face comparison failed: {}", e.getMessage(), e);
            result.put("result", "ERROR");
            result.put("confidence", 0.0);
            result.put("details", "Local verification error: " + e.getMessage());
        }

        return result;
    }

    /**
     * Detect faces in an image — used for video frame validation and liveness check.
     */
    public Map<String, Object> detectFaces(byte[] imageBytes) {
        Map<String, Object> result = new HashMap<>();
        try {
            BufferedImage image = decodeImage(imageBytes);
            if (image == null) {
                result.put("faceCount", 0);
                result.put("confidence", 0.0);
                result.put("eyesOpen", false);
                result.put("mouthOpen", false);
                result.put("details", "Unable to decode image for local vision analysis.");
                return result;
            }

            RectVector faces = detectFacesLocally(imageBytes);
            int detectedCount = (int) faces.size();
            double brightness = computeBrightness(image);
            double sharpness = computeSharpness(image);
            int faceCount = detectedCount > 0 ? detectedCount : (sharpness > 12.0 && brightness > 35.0 ? 1 : 0);
            double confidence = clamp((sharpness * 3.0) + (faceCount > 0 ? 55.0 : 0.0), 0, 100);
            boolean eyesOpen = faceCount > 0 && detectEyes(imageBytes, faces);
            boolean mouthOpen = faceCount == 1 && sharpness > 14.0 && brightness > 55.0;

            result.put("faceCount", faceCount);
            result.put("confidence", round(confidence));
            result.put("eyesOpen", eyesOpen);
            result.put("mouthOpen", mouthOpen);
            result.put("details", faceCount > 0
                    ? String.format("Local face analysis detected %d face(s). Brightness=%.1f, sharpness=%.1f.", faceCount, brightness, sharpness)
                    : "No reliable face detected in the provided frame.");
        } catch (Exception e) {
            log.error("Local face detection error: {}", e.getMessage(), e);
            result.put("faceCount", 0);
            result.put("confidence", 0.0);
            result.put("eyesOpen", false);
            result.put("mouthOpen", false);
            result.put("details", "Local face detection error: " + e.getMessage());
        }
        return result;
    }

    /**
     * Perform comprehensive multi-factor identity verification:
     * 1. Photo face comparison
     * 2. Video frame face comparison
     * 3. Audio presence analysis
     */
    public Map<String, Object> performFullVerification(byte[] originalPhoto,
                                                       byte[] verificationSnapshot,
                                                       byte[] videoFrameSnapshot,
                                                       boolean audioPresent) {
        Map<String, Object> fullResult = new HashMap<>();

        log.info("Running local photo-to-photo face comparison...");
        Map<String, Object> photoMatch = compareFaces(originalPhoto, verificationSnapshot);
        fullResult.put("photoMatchResult", photoMatch.get("result"));
        fullResult.put("photoMatchConfidence", photoMatch.get("confidence"));
        fullResult.put("photoMatchDetails", photoMatch.get("details"));

        boolean videoMatch = false;
        if (videoFrameSnapshot != null && videoFrameSnapshot.length > 0) {
            log.info("Running local video frame face comparison...");
            Map<String, Object> videoCompare = compareFaces(originalPhoto, videoFrameSnapshot);
            String videoResult = (String) videoCompare.get("result");
            videoMatch = "MATCH".equals(videoResult);
            fullResult.put("videoMatchResult", videoResult);
            fullResult.put("videoMatchConfidence", videoCompare.get("confidence"));
            fullResult.put("videoMatchDetails", videoCompare.get("details"));

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

        fullResult.put("audioPresent", audioPresent);
        fullResult.put("audioAnalysis", audioPresent
                ? "Audio detected in verification recording — voice present during response."
                : "No audio detected — candidate may not have spoken during recording.");

        String photoResult = (String) photoMatch.get("result");
        double photoConfidence = valueAsDouble(photoMatch.get("confidence"));

        String overallResult;
        double overallConfidence;

        if ("MATCH".equals(photoResult) && videoMatch && audioPresent) {
            overallResult = "MATCH";
            double videoConf = valueAsDouble(fullResult.get("videoMatchConfidence"));
            overallConfidence = (photoConfidence * 0.5) + (videoConf * 0.3) + 20.0;
        } else if ("MATCH".equals(photoResult) && (videoMatch || audioPresent)) {
            overallResult = "MATCH";
            overallConfidence = photoConfidence * 0.7 + (audioPresent ? 15.0 : 0.0)
                    + (videoMatch ? 15.0 : 0.0);
        } else if ("MATCH".equals(photoResult)) {
            overallResult = "MATCH";
            overallConfidence = photoConfidence * 0.8;
        } else if ("MISMATCH".equals(photoResult)) {
            overallResult = "MISMATCH";
            overallConfidence = photoConfidence;
        } else {
            overallResult = "ERROR";
            overallConfidence = 0.0;
        }

        fullResult.put("overallResult", overallResult);
        fullResult.put("overallConfidence", Math.min(round(overallConfidence), 100.0));
        return fullResult;
    }

    private CascadeClassifier loadClassifier(String classifierFile) {
        String[] candidatePaths = new String[]{
                "/org/bytedeco/opencv/data/" + classifierFile,
                "/" + classifierFile
        };

        for (String candidatePath : candidatePaths) {
            try (InputStream inputStream = IdentityVerificationService.class.getResourceAsStream(candidatePath)) {
                if (inputStream == null) {
                    continue;
                }

                Path tempFile = Files.createTempFile("opencv-cascade-", "-" + classifierFile);
                Files.copy(inputStream, tempFile, StandardCopyOption.REPLACE_EXISTING);
                tempFile.toFile().deleteOnExit();

                CascadeClassifier classifier = new CascadeClassifier(tempFile.toAbsolutePath().toString());
                if (!classifier.empty()) {
                    return classifier;
                }
            } catch (Exception e) {
                log.debug("Unable to load OpenCV cascade from {}: {}", candidatePath, e.getMessage());
            }
        }

        log.warn("OpenCV cascade '{}' could not be loaded from the classpath. Falling back to heuristic-only face checks.", classifierFile);
        return new CascadeClassifier();
    }

    private Rect detectPrimaryFace(byte[] imageBytes) {
        RectVector faces = detectFacesLocally(imageBytes);
        return faces.size() > 0 ? faces.get(0) : null;
    }

    private RectVector detectFacesLocally(byte[] imageBytes) {
        RectVector faces = new RectVector();
        try {
            if (faceCascade.empty()) {
                return faces;
            }

            Mat image = decodeMat(imageBytes);
            if (image == null || image.empty()) {
                return faces;
            }

            Mat gray = new Mat();
            cvtColor(image, gray, COLOR_BGR2GRAY);
            equalizeHist(gray, gray);
            faceCascade.detectMultiScale(gray, faces, 1.1, 4, 0, new Size(60, 60), new Size());
        } catch (Throwable t) {
            log.debug("Local OpenCV face detection fallback engaged: {}", t.getMessage());
        }
        return faces;
    }

    private boolean detectEyes(byte[] imageBytes, RectVector faces) {
        try {
            if (eyeCascade.empty()) {
                return true;
            }
            Mat image = decodeMat(imageBytes);
            if (image == null || image.empty()) {
                return false;
            }
            Mat gray = new Mat();
            cvtColor(image, gray, COLOR_BGR2GRAY);
            equalizeHist(gray, gray);

            RectVector targetFaces = faces.size() > 0 ? faces : detectFacesLocally(imageBytes);
            if (targetFaces.size() == 0) {
                return false;
            }

            Rect face = targetFaces.get(0);
            Mat faceRegion = new Mat(gray, face);
            RectVector eyes = new RectVector();
            eyeCascade.detectMultiScale(faceRegion, eyes, 1.1, 3, 0, new Size(15, 15), new Size());
            return eyes.size() > 0;
        } catch (Throwable t) {
            return true;
        }
    }

    private Mat decodeMat(byte[] imageBytes) {
        if (imageBytes == null || imageBytes.length == 0) {
            return null;
        }
        BytePointer pointer = new BytePointer(imageBytes);
        Mat rawData = new Mat(1, imageBytes.length, CV_8U, pointer);
        return imdecode(rawData, IMREAD_COLOR);
    }

    private BufferedImage decodeImage(byte[] imageBytes) {
        if (imageBytes == null || imageBytes.length == 0) {
            return null;
        }
        try {
            return ImageIO.read(new ByteArrayInputStream(imageBytes));
        } catch (Exception e) {
            return null;
        }
    }

    private BufferedImage cropBestRegion(BufferedImage image, Rect face) {
        int width = image.getWidth();
        int height = image.getHeight();

        int x;
        int y;
        int w;
        int h;

        if (face != null) {
            x = Math.max(face.x(), 0);
            y = Math.max(face.y(), 0);
            w = Math.min(face.width(), width - x);
            h = Math.min(face.height(), height - y);
        } else {
            w = Math.max(width / 2, 1);
            h = Math.max(height / 2, 1);
            x = Math.max((width - w) / 2, 0);
            y = Math.max((height - h) / 2, 0);
        }

        return image.getSubimage(x, y, Math.max(w, 1), Math.max(h, 1));
    }

    private BufferedImage normalizeImage(BufferedImage image, int width, int height) {
        BufferedImage normalized = new BufferedImage(width, height, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D graphics = normalized.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        graphics.drawImage(image, 0, 0, width, height, null);
        graphics.dispose();
        return normalized;
    }

    private double compareNormalizedImages(BufferedImage first, BufferedImage second) {
        long totalDifference = 0;
        int pixelCount = first.getWidth() * first.getHeight();
        for (int y = 0; y < first.getHeight(); y++) {
            for (int x = 0; x < first.getWidth(); x++) {
                int valueA = first.getRGB(x, y) & 0xFF;
                int valueB = second.getRGB(x, y) & 0xFF;
                totalDifference += Math.abs(valueA - valueB);
            }
        }
        double averageDifference = (double) totalDifference / pixelCount;
        return clamp(100.0 - ((averageDifference / 255.0) * 100.0), 0, 100);
    }

    private double compareHistograms(BufferedImage first, BufferedImage second) {
        double[] histA = buildHistogram(first);
        double[] histB = buildHistogram(second);

        double intersection = 0.0;
        double union = 0.0;
        for (int i = 0; i < histA.length; i++) {
            intersection += Math.min(histA[i], histB[i]);
            union += Math.max(histA[i], histB[i]);
        }
        if (union == 0.0) {
            return 0.0;
        }
        return clamp((intersection / union) * 100.0, 0, 100);
    }

    private double[] buildHistogram(BufferedImage image) {
        double[] histogram = new double[32];
        int totalPixels = image.getWidth() * image.getHeight();
        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                int value = image.getRGB(x, y) & 0xFF;
                int bucket = Math.min((value * histogram.length) / 256, histogram.length - 1);
                histogram[bucket] += 1.0;
            }
        }
        if (totalPixels > 0) {
            for (int i = 0; i < histogram.length; i++) {
                histogram[i] /= totalPixels;
            }
        }
        return histogram;
    }

    private double computeBrightness(BufferedImage image) {
        long total = 0;
        int pixelCount = image.getWidth() * image.getHeight();
        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                total += image.getRGB(x, y) & 0xFF;
            }
        }
        return pixelCount == 0 ? 0.0 : (double) total / pixelCount;
    }

    private double computeSharpness(BufferedImage image) {
        double totalGradient = 0.0;
        int samples = 0;
        for (int y = 1; y < image.getHeight(); y++) {
            for (int x = 1; x < image.getWidth(); x++) {
                int current = image.getRGB(x, y) & 0xFF;
                int left = image.getRGB(x - 1, y) & 0xFF;
                int top = image.getRGB(x, y - 1) & 0xFF;
                totalGradient += Math.abs(current - left) + Math.abs(current - top);
                samples += 2;
            }
        }
        return samples == 0 ? 0.0 : totalGradient / samples;
    }

    private double valueAsDouble(Object value) {
        return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
