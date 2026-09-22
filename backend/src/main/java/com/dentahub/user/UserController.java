package com.dentahub.user;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.role.RoleRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {

    private final UserRepository repository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository repository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<UserResponse> list(@RequestParam(defaultValue = "") String q) {
        List<UserAccount> users = q.isBlank()
                ? repository.findAllByOrderByCreatedAtDesc()
                : repository.findByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrderByCreatedAtDesc(q, q);
        return users.stream().map(this::toResponse).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateUserRequest request) {
        if (repository.findByEmailIgnoreCase(request.email()).isPresent()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("A user with this email already exists"));
        }
        if (request.roleId() != null && !roleRepository.existsById(request.roleId())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Selected role was not found"));
        }
        UserAccount user = new UserAccount();
        user.setFullName(request.fullName().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRoleId(request.roleId());
        user.setStatus(normalizeStatus(request.status()));
        return ResponseEntity.ok(toResponse(repository.save(user)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        UserAccount user = repository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();
        if (request.roleId() != null && !roleRepository.existsById(request.roleId())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Selected role was not found"));
        }
        UserAccount existing = repository.findByEmailIgnoreCase(request.email()).orElse(null);
        if (existing != null && !existing.getId().equals(id)) {
            return ResponseEntity.badRequest().body(new ErrorResponse("A user with this email already exists"));
        }
        user.setFullName(request.fullName().trim());
        user.setEmail(request.email().trim().toLowerCase());
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        user.setRoleId(request.roleId());
        user.setStatus(normalizeStatus(request.status()));
        return ResponseEntity.ok(toResponse(repository.save(user)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private UserResponse toResponse(UserAccount user) {
        String roleName = user.getRoleId() == null ? null : roleRepository.findById(user.getRoleId()).map(role -> role.getName()).orElse(null);
        return new UserResponse(user.getId(), user.getFullName(), user.getEmail(), user.getRoleId(), roleName, user.getStatus());
    }

    private static String normalizeStatus(String status) {
        return status == null || status.isBlank() ? "ACTIVE" : status.toUpperCase();
    }

    public record CreateUserRequest(@NotBlank String fullName, @NotBlank @Email String email, @NotBlank String password, Long roleId, String status) { }
    public record UpdateUserRequest(@NotBlank String fullName, @NotBlank @Email String email, String password, Long roleId, String status) { }
    public record UserResponse(Long id, String fullName, String email, Long roleId, String roleName, String status) { }
    public record ErrorResponse(String message) { }
}
