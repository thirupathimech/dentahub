package com.dentahub.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.role.RoleRepository;
import com.dentahub.user.UserAccount;
import com.dentahub.user.UserRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.dentahub.role.MenuPermissions;

import java.util.List;

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
    private final AuthSettingsRepository authSettingsRepository;

    public AuthController(
            @Value("${APP_ADMIN_EMAIL:admin@dentahub.com}") String adminEmail,
            @Value("${APP_ADMIN_PASSWORD:admin123}") String adminPassword,
            @Value("${APP_ADMIN_NAME:}") String adminName,
            @Value("${APP_CLINIC_NAME:DentaHub Clinic}") String clinicName,
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            AuthSettingsRepository authSettingsRepository) {
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.adminName = adminName;
        this.clinicName = clinicName;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.authSettingsRepository = authSettingsRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        UserAccount databaseUser = userRepository.findByEmailIgnoreCase(request.email()).orElse(null);
        if (databaseUser != null) {
            if (!"ACTIVE".equalsIgnoreCase(databaseUser.getStatus()) || !passwordEncoder.matches(request.password(), databaseUser.getPasswordHash())) {
                return unauthorized();
            }
            var role = databaseUser.getRoleId() == null ? null : roleRepository.findById(databaseUser.getRoleId()).orElse(null);
            if (role != null && !role.isActive()) {
                return unauthorized();
            }
            String roleName = role == null ? "User" : role.getName();
            return ResponseEntity.ok(new LoginResponse(
                    "dentahub-user-session-" + databaseUser.getId(),
                    new UserProfile(String.valueOf(databaseUser.getId()), databaseUser.getFullName(), databaseUser.getEmail(), roleName, clinicName,
                            role == null ? List.of() : MenuPermissions.asList(role.getPermissions()), databaseUser.getBranchId(), role != null && role.isBranchScoped())));
        }
        if (!adminEmail.equalsIgnoreCase(request.email()) || !matchesAdminPassword(request.password())) {
            return unauthorized();
        }

        return ResponseEntity.ok(new LoginResponse(
                "dentahub-demo-session",
                new UserProfile("admin", adminName.isBlank() ? adminEmail : adminName, adminEmail, "Administrator", clinicName, MenuPermissions.ALL, null, false)));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody ChangePasswordRequest request) {
        String token = bearerToken(authorization);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse("Your session has expired. Please sign in again."));
        }

        if ("dentahub-demo-session".equals(token)) {
            if (!matchesAdminPassword(request.currentPassword())) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Current password is incorrect"));
            }
            AuthSettings settings = authSettingsRepository.findById(1L).orElseGet(AuthSettings::new);
            settings.setId(1L);
            settings.setAdminPasswordHash(passwordEncoder.encode(request.newPassword()));
            authSettingsRepository.save(settings);
            return ResponseEntity.ok(new SuccessResponse("Password changed successfully"));
        }

        if (!token.startsWith("dentahub-user-session-")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse("Your session is not valid. Please sign in again."));
        }

        try {
            Long userId = Long.valueOf(token.substring("dentahub-user-session-".length()));
            UserAccount user = userRepository.findById(userId).orElse(null);
            if (user == null || !"ACTIVE".equalsIgnoreCase(user.getStatus()) || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Current password is incorrect"));
            }
            user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
            userRepository.save(user);
            return ResponseEntity.ok(new SuccessResponse("Password changed successfully"));
        } catch (NumberFormatException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse("Your session is not valid. Please sign in again."));
        }
    }

    private boolean matchesAdminPassword(String candidate) {
        return authSettingsRepository.findById(1L)
                .map(settings -> passwordEncoder.matches(candidate, settings.getAdminPasswordHash()))
                .orElseGet(() -> adminPassword.equals(candidate));
    }

    private static String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        String token = authorization.substring("Bearer ".length()).trim();
        return token.isBlank() ? null : token;
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

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 6) String newPassword) {
    }

    public record SuccessResponse(String message) {
    }

    public record UserProfile(String id, String name, String email, String role, String clinicName, List<String> permissions, Long branchId, boolean branchScoped) {
    }

    public record ErrorResponse(String message) {
    }
}
