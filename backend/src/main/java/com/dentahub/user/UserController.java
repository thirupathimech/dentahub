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
import com.dentahub.role.MenuPermissions;
import com.dentahub.role.Role;
import com.dentahub.branch.BranchRepository;
import com.dentahub.auth.BranchAccessService;
import org.springframework.web.bind.annotation.RequestHeader;

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
    private final BranchRepository branchRepository;
    private final BranchAccessService accessService;

    public UserController(UserRepository repository, RoleRepository roleRepository, PasswordEncoder passwordEncoder, BranchRepository branchRepository, BranchAccessService accessService) {
        this.repository = repository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.branchRepository = branchRepository;
        this.accessService = accessService;
    }

    @GetMapping
    public List<UserResponse> list(@RequestParam(defaultValue = "") String q, @RequestHeader(value = "Authorization", required = false) String authorization) {
        List<UserAccount> users = q.isBlank()
                ? repository.findAllByOrderByCreatedAtDesc()
                : repository.findByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrderByCreatedAtDesc(q, q);
        return users.stream().filter(user -> accessService.canAccess(authorization, user.getBranchId())).map(this::toResponse).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authorization, @Valid @RequestBody CreateUserRequest request) {
        if (repository.findByEmailIgnoreCase(request.email()).isPresent()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("A user with this email already exists"));
        }
        if (request.roleId() != null && !roleRepository.existsById(request.roleId())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Selected role was not found"));
        }
        Long effectiveBranchId = accessService.scopedBranch(authorization).orElse(request.branchId());
        ResponseEntity<?> branchValidation = validateBranchAssignment(request.roleId(), effectiveBranchId);
        if (branchValidation != null) return branchValidation;
        if (!accessService.canAccess(authorization, effectiveBranchId)) return ResponseEntity.status(403).body(new ErrorResponse("You can only assign users to your branch"));
        UserAccount user = new UserAccount();
        user.setFullName(request.fullName().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRoleId(request.roleId());
        user.setBranchId(effectiveBranchId);
        user.setStatus(normalizeStatus(request.status()));
        return ResponseEntity.ok(toResponse(repository.save(user)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String authorization, @Valid @RequestBody UpdateUserRequest request) {
        UserAccount user = repository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();
        if (!accessService.canAccess(authorization, user.getBranchId())) return ResponseEntity.status(403).body(new ErrorResponse("You can only manage users in your branch"));
        if (request.roleId() != null && !roleRepository.existsById(request.roleId())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Selected role was not found"));
        }
        Long effectiveBranchId = accessService.scopedBranch(authorization).orElse(request.branchId());
        ResponseEntity<?> branchValidation = validateBranchAssignment(request.roleId(), effectiveBranchId);
        if (branchValidation != null) return branchValidation;
        if (!accessService.canAccess(authorization, effectiveBranchId)) return ResponseEntity.status(403).body(new ErrorResponse("You can only assign users to your branch"));
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
        user.setBranchId(effectiveBranchId);
        user.setStatus(normalizeStatus(request.status()));
        return ResponseEntity.ok(toResponse(repository.save(user)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (!repository.findById(id).map(user -> accessService.canAccess(authorization, user.getBranchId())).orElse(false)) return ResponseEntity.notFound().build();
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private UserResponse toResponse(UserAccount user) {
        var role = user.getRoleId() == null ? null : roleRepository.findById(user.getRoleId()).orElse(null);
        return new UserResponse(user.getId(), user.getFullName(), user.getEmail(), user.getRoleId(), role == null ? null : role.getName(),
                role == null ? List.of() : MenuPermissions.asList(role.getPermissions()), user.getBranchId(), user.getStatus());
    }

    private ResponseEntity<?> validateBranchAssignment(Long roleId, Long branchId) {
        if (branchId != null && !branchRepository.existsById(branchId)) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Selected branch was not found"));
        }
        if (roleId != null) {
            Role role = roleRepository.findById(roleId).orElse(null);
            if (role != null && role.isBranchScoped() && (branchId == null || !branchId.equals(role.getBranchId()))) {
                return ResponseEntity.badRequest().body(new ErrorResponse("This role requires the user to be assigned to its branch"));
            }
        }
        return null;
    }

    private static String normalizeStatus(String status) {
        return status == null || status.isBlank() ? "ACTIVE" : status.toUpperCase();
    }

    public record CreateUserRequest(@NotBlank String fullName, @NotBlank @Email String email, @NotBlank String password, Long roleId, Long branchId, String status) { }
    public record UpdateUserRequest(@NotBlank String fullName, @NotBlank @Email String email, String password, Long roleId, Long branchId, String status) { }
    public record UserResponse(Long id, String fullName, String email, Long roleId, String roleName, List<String> permissions, Long branchId, String status) { }
    public record ErrorResponse(String message) { }
}
