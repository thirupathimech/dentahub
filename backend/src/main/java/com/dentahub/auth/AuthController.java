package com.dentahub.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

    private final String adminEmail;
    private final String adminPassword;
    private final String adminName;
    private final String clinicName;

    public AuthController(
            @Value("${APP_ADMIN_EMAIL:admin@dentahub.com}") String adminEmail,
            @Value("${APP_ADMIN_PASSWORD:admin123}") String adminPassword,
            @Value("${APP_ADMIN_NAME:}") String adminName,
            @Value("${APP_CLINIC_NAME:DentaHub Clinic}") String clinicName) {
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.adminName = adminName;
        this.clinicName = clinicName;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        if (!adminEmail.equalsIgnoreCase(request.email()) || !adminPassword.equals(request.password())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Invalid email or password"));
        }

        return ResponseEntity.ok(new LoginResponse(
                "dentahub-demo-session",
                new UserProfile("admin", adminName.isBlank() ? adminEmail : adminName, adminEmail, "Administrator", clinicName)));
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {
    }

    public record LoginResponse(String token, UserProfile user) {
    }

    public record UserProfile(String id, String name, String email, String role, String clinicName) {
    }

    public record ErrorResponse(String message) {
    }
}
