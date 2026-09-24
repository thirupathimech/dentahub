package com.dentahub.role;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.user.UserRepository;
import com.dentahub.branch.BranchRepository;
import com.dentahub.auth.BranchAccessService;
import org.springframework.web.bind.annotation.RequestHeader;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/roles")
@Validated
public class RoleController {

    private final RoleRepository repository;
    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final BranchAccessService accessService;

    public RoleController(RoleRepository repository, UserRepository userRepository, BranchRepository branchRepository, BranchAccessService accessService) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.branchRepository = branchRepository;
        this.accessService = accessService;
    }

    @GetMapping
    public List<RoleResponse> list(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return repository.findAllByOrderByNameAsc().stream().filter(role -> !role.isBranchScoped() || accessService.canAccess(authorization, role.getBranchId())).map(RoleController::toResponse).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody RoleRequest request) {
        if (Boolean.TRUE.equals(request.branchScoped()) && !validBranch(request.branchId())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("A valid branch is required for branch-wise roles"));
        }
        Role role = new Role();
        apply(role, request);
        return ResponseEntity.ok(toResponse(repository.save(role)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoleResponse> update(@PathVariable Long id, @Valid @RequestBody RoleRequest request) {
        if (Boolean.TRUE.equals(request.branchScoped()) && !validBranch(request.branchId())) {
            return ResponseEntity.badRequest().build();
        }
        return repository.findById(id)
                .map(role -> {
                    apply(role, request);
                    return ResponseEntity.ok(toResponse(repository.save(role)));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        if (userRepository.countByRoleId(id) > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse("This role is assigned to users and cannot be deleted"));
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private static void apply(Role role, RoleRequest request) {
        role.setName(request.name().trim());
        role.setDescription(blankToNull(request.description()));
        role.setPermissions(blankToNull(MenuPermissions.normalize(request.permissions())));
        role.setActive(request.active() == null || request.active());
        role.setBranchScoped(request.branchScoped() != null && request.branchScoped());
        role.setBranchId(role.isBranchScoped() ? request.branchId() : null);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static RoleResponse toResponse(Role role) {
        return new RoleResponse(role.getId(), role.getName(), role.getDescription(), role.getPermissions(), role.isActive(), role.isBranchScoped(), role.getBranchId());
    }

    private boolean validBranch(Long branchId) { return branchId != null && branchRepository.existsById(branchId); }

    public record RoleRequest(@NotBlank String name, String description, String permissions, Boolean active, Boolean branchScoped, Long branchId) { }
    public record RoleResponse(Long id, String name, String description, String permissions, boolean active, boolean branchScoped, Long branchId) { }
    public record ErrorResponse(String message) { }
}
