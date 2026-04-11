package com.example.backend.controller;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.S3Service;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/photo")
public class PhotoController {

    private final S3Service s3Service;
    private final UserRepository userRepository;

    public PhotoController(S3Service s3Service, UserRepository userRepository) {
        this.s3Service = s3Service;
        this.userRepository = userRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadPhoto(@RequestParam("file") MultipartFile file,
                                         Authentication authentication) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file provided"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "File must be an image"));
        }

        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String key = s3Service.buildPhotoKey(username, user.getId());

        try {
            s3Service.uploadPhoto(key, file.getBytes(), contentType);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to read file"));
        }

        user.setPhotoKey(key);
        userRepository.save(user);

        String presignedUrl = s3Service.generatePresignedUrl(key);
        return ResponseEntity.ok(Map.of("photoUrl", presignedUrl, "message", "Photo uploaded successfully"));
    }

    @GetMapping("/{username}")
    public ResponseEntity<?> getPhoto(@PathVariable String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null || user.getPhotoKey() == null) {
            return ResponseEntity.ok(Map.of("photoUrl", ""));
        }

        String presignedUrl = s3Service.generatePresignedUrl(user.getPhotoKey());
        return ResponseEntity.ok(Map.of("photoUrl", presignedUrl));
    }

    @DeleteMapping
    public ResponseEntity<?> deletePhoto(Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getPhotoKey() != null) {
            s3Service.deletePhoto(user.getPhotoKey());
            user.setPhotoKey(null);
            userRepository.save(user);
        }

        return ResponseEntity.ok(Map.of("message", "Photo deleted successfully"));
    }
}
