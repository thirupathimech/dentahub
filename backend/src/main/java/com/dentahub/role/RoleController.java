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

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/roles")
@Validated
public class RoleController {

    private final RoleRepository repository;
    private final UserRepository userRepository;

    public RoleController(RoleRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<RoleResponse> list() {
        return repository.findAllByOrderByNameAsc().stream().map(RoleController::toResponse).toList();
    }

    @PostMapping
    public RoleResponse create(@Valid @RequestBody RoleRequest request) {
        Role role = new Role();
        apply(role, request);
        return toResponse(repository.save(role));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoleResponse> update(@PathVariable Long id, @Valid @RequestBody RoleRequest request) {
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
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static RoleResponse toResponse(Role role) {
        return new RoleResponse(role.getId(), role.getName(), role.getDescription(), role.getPermissions(), role.isActive());
    }

    public record RoleRequest(@NotBlank String name, String description, String permissions, Boolean active) { }
    public record RoleResponse(Long id, String name, String description, String permissions, boolean active) { }
    public record ErrorResponse(String message) { }
}
