package com.dentahub.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.role.RoleRepository;
import com.dentahub.user.UserAccount;
import com.dentahub.user.UserRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.crypto.password.PasswordEncoder;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

    private final String adminEmail;
    private final String adminPassword;
    private final String adminName;
    private final String clinicName;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(
            @Value("${APP_ADMIN_EMAIL:admin@dentahub.com}") String adminEmail,
            @Value("${APP_ADMIN_PASSWORD:admin123}") String adminPassword,
            @Value("${APP_ADMIN_NAME:}") String adminName,
            @Value("${APP_CLINIC_NAME:DentaHub Clinic}") String clinicName,
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder) {
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.adminName = adminName;
        this.clinicName = clinicName;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        UserAccount databaseUser = userRepository.findByEmailIgnoreCase(request.email()).orElse(null);
        if (databaseUser != null) {
            if (!"ACTIVE".equalsIgnoreCase(databaseUser.getStatus()) || !passwordEncoder.matches(request.password(), databaseUser.getPasswordHash())) {
                return unauthorized();
            }
            String roleName = databaseUser.getRoleId() == null ? "User" : roleRepository.findById(databaseUser.getRoleId()).map(role -> role.getName()).orElse("User");
            return ResponseEntity.ok(new LoginResponse(
                    "dentahub-user-session-" + databaseUser.getId(),
                    new UserProfile(String.valueOf(databaseUser.getId()), databaseUser.getFullName(), databaseUser.getEmail(), roleName, clinicName)));
        }
        if (!adminEmail.equalsIgnoreCase(request.email()) || !adminPassword.equals(request.password())) {
            return unauthorized();
        }

        return ResponseEntity.ok(new LoginResponse(
                "dentahub-demo-session",
                new UserProfile("admin", adminName.isBlank() ? adminEmail : adminName, adminEmail, "Administrator", clinicName)));
    }

    private ResponseEntity<ErrorResponse> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse("Invalid email or password"));
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
