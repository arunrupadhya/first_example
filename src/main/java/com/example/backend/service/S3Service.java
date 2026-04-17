package com.example.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.time.Duration;

@Service
public class S3Service {

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.s3.photo-prefix}")
    private String photoPrefix;

    @Value("${aws.s3.document-prefix}")
    private String documentPrefix;

    @Value("${aws.s3.video-prefix}")
    private String videoPrefix;

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    public S3Service(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
    }

    public String buildPhotoKey(String username, Long userId) {
        return photoPrefix + username + "-" + userId + ".jpg";
    }

    public void uploadPhoto(String key, byte[] imageBytes, String contentType) {
        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build();
        s3Client.putObject(putRequest, RequestBody.fromBytes(imageBytes));
    }

    public String generatePresignedUrl(String key) {
        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .getObjectRequest(getRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    public void deletePhoto(String key) {
        DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();
        s3Client.deleteObject(deleteRequest);
    }

    public String buildDocumentKey(Long candidateId, String docType, String originalFilename) {
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex);
        }
        return documentPrefix + candidateId + "/" + docType + extension;
    }

    public String buildCandidatePhotoKey(Long candidateId) {
        return photoPrefix + "candidate-" + candidateId + ".jpg";
    }

    public String buildCandidateVideoKey(Long candidateId) {
        return videoPrefix + "candidate-" + candidateId + ".webm";
    }

    public String buildVerificationVideoKey(Long candidateId, Integer roundNumber) {
        return videoPrefix + "verification/candidate-" + candidateId + "-round-" + roundNumber + ".webm";
    }

    public String buildVerificationSnapshotKey(Long candidateId, Integer roundNumber) {
        return photoPrefix + "verification/candidate-" + candidateId + "-round-" + roundNumber + ".jpg";
    }

    public byte[] downloadFile(String key) {
        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();
        try (var inputStream = s3Client.getObject(getRequest)) {
            return inputStream.readAllBytes();
        } catch (java.io.IOException e) {
            throw new RuntimeException("Failed to download file from S3: " + key, e);
        }
    }

    public void uploadFile(String key, byte[] data, String contentType) {
        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build();
        s3Client.putObject(putRequest, RequestBody.fromBytes(data));
    }
}
