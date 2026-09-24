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
import org.springframework.web.bind.annotation.RequestHeader;

import com.dentahub.auth.BranchAccessService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/branches")
@Validated
public class BranchController {

    private final BranchRepository repository;
    private final BranchAccessService accessService;

    public BranchController(BranchRepository repository, BranchAccessService accessService) {
        this.repository = repository;
        this.accessService = accessService;
    }

    @GetMapping
    public List<BranchResponse> list(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return repository.findAllByOrderByNameAsc().stream().filter(branch -> accessService.canAccess(authorization, branch.getId())).map(BranchController::toResponse).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authorization, @Valid @RequestBody BranchRequest request) {
        if (accessService.scopedBranch(authorization).isPresent()) return ResponseEntity.status(403).body(new ErrorResponse("Branch-scoped users cannot create another branch"));
        Branch branch = new Branch();
        apply(branch, request);
        return ResponseEntity.ok(toResponse(repository.save(branch)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String authorization, @Valid @RequestBody BranchRequest request) {
        if (!accessService.canAccess(authorization, id)) return ResponseEntity.status(403).body(new ErrorResponse("You can only manage your assigned branch"));
        return repository.findById(id)
                .map(branch -> {
                    apply(branch, request);
                    return ResponseEntity.ok(toResponse(repository.save(branch)));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (!accessService.canAccess(authorization, id)) return ResponseEntity.status(403).body(new ErrorResponse("You can only manage your assigned branch"));
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

    public record ErrorResponse(String message) { }
}
