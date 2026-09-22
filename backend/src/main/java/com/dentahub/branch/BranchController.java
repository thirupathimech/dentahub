package com.dentahub.branch;

import java.util.List;

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

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/branches")
@Validated
public class BranchController {

    private final BranchRepository repository;

    public BranchController(BranchRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<BranchResponse> list() {
        return repository.findAllByOrderByNameAsc().stream().map(BranchController::toResponse).toList();
    }

    @PostMapping
    public BranchResponse create(@Valid @RequestBody BranchRequest request) {
        Branch branch = new Branch();
        apply(branch, request);
        return toResponse(repository.save(branch));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BranchResponse> update(@PathVariable Long id, @Valid @RequestBody BranchRequest request) {
        return repository.findById(id)
                .map(branch -> {
                    apply(branch, request);
                    return ResponseEntity.ok(toResponse(repository.save(branch)));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private static void apply(Branch branch, BranchRequest request) {
        branch.setName(request.name().trim());
        branch.setCode(request.code().trim().toUpperCase());
        branch.setPhone(blankToNull(request.phone()));
        branch.setEmail(blankToNull(request.email()));
        branch.setAddress(blankToNull(request.address()));
        branch.setCity(blankToNull(request.city()));
        branch.setState(blankToNull(request.state()));
        branch.setPostalCode(blankToNull(request.postalCode()));
        branch.setActive(request.active() == null || request.active());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static BranchResponse toResponse(Branch branch) {
        return new BranchResponse(branch.getId(), branch.getName(), branch.getCode(), branch.getPhone(), branch.getEmail(),
                branch.getAddress(), branch.getCity(), branch.getState(), branch.getPostalCode(), branch.isActive());
    }

    public record BranchRequest(
            @NotBlank String name,
            @NotBlank String code,
            String phone,
            @Email String email,
            String address,
            String city,
            String state,
            String postalCode,
            Boolean active) {
    }

    public record BranchResponse(
            Long id,
            String name,
            String code,
            String phone,
            String email,
            String address,
            String city,
            String state,
            String postalCode,
            boolean active) {
    }
}
