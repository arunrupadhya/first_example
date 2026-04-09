package com.example.backend.controller;

import com.example.backend.dto.AuthRequest;
import com.example.backend.dto.AuthResponse;
import com.example.backend.model.User;
import com.example.backend.service.UserService;
import com.example.backend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AuthenticationManager authenticationManager;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            userService.register(user);
            return ResponseEntity.ok("User registered successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Registration failed");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest authRequest) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(authRequest.getUsername(), authRequest.getPassword())
            );
            User user = userService.findByUsername(authRequest.getUsername());
            String token = jwtUtil.generateToken(user.getUsername());
            return ResponseEntity.ok(new AuthResponse(token));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Invalid credentials");
        }
    }
}