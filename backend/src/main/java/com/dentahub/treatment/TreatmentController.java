package com.dentahub.treatment;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.auth.BranchAccessService;
import com.dentahub.branch.BranchRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/treatments")
@Validated
public class TreatmentController {

    private final TreatmentRepository repository;
    private final BranchRepository branchRepository;
    private final BranchAccessService accessService;

    public TreatmentController(TreatmentRepository repository, BranchRepository branchRepository, BranchAccessService accessService) {
        this.repository = repository;
        this.branchRepository = branchRepository;
        this.accessService = accessService;
    }

    @GetMapping
    public List<TreatmentResponse> list(@RequestParam(defaultValue = "") String q,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        List<Treatment> treatments = q.isBlank()
                ? repository.findAllByOrderByNameAsc()
                : repository.findByNameContainingIgnoreCaseOrCategoryContainingIgnoreCaseOrderByNameAsc(q, q);
        return treatments.stream()
                .filter(treatment -> accessService.canAccess(authorization, treatment.getBranchId()))
                .map(TreatmentController::toResponse).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody TreatmentRequest request) {
        Long branchId = effectiveBranch(authorization, request.branchId());
        ResponseEntity<?> branchError = validateBranch(branchId);
        if (branchError != null) return branchError;
        Treatment treatment = new Treatment();
        apply(treatment, request, branchId);
        return ResponseEntity.ok(toResponse(repository.save(treatment)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody TreatmentRequest request) {
        Long branchId = effectiveBranch(authorization, request.branchId());
        ResponseEntity<?> branchError = validateBranch(branchId);
        if (branchError != null) return branchError;
        return repository.findById(id)
                .filter(treatment -> accessService.canAccess(authorization, treatment.getBranchId()))
                .map(treatment -> {
                    apply(treatment, request, branchId);
                    return ResponseEntity.ok(toResponse(repository.save(treatment)));
                }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Treatment treatment = repository.findById(id).orElse(null);
        if (treatment == null) return ResponseEntity.notFound().build();
        if (!accessService.canAccess(authorization, treatment.getBranchId())) {
            return ResponseEntity.status(403).body(new ErrorResponse("You can only manage treatments in your assigned branch"));
        }
        repository.delete(treatment);
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<?> validateBranch(Long branchId) {
        return branchId != null && !branchRepository.existsById(branchId)
                ? ResponseEntity.badRequest().body(new ErrorResponse("Selected branch was not found")) : null;
    }

    private Long effectiveBranch(String authorization, Long requestedBranchId) {
        return accessService.scopedBranch(authorization).orElse(requestedBranchId);
    }

    private static void apply(Treatment treatment, TreatmentRequest request, Long branchId) {
        treatment.setName(request.name().trim());
        treatment.setCategory(blankToNull(request.category()));
        treatment.setDescription(blankToNull(request.description()));
        treatment.setDurationMinutes(request.durationMinutes());
        treatment.setPrice(request.price() == null ? BigDecimal.ZERO : request.price());
        treatment.setActive(request.active() == null || request.active());
        treatment.setBranchId(branchId);
    }

    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private static TreatmentResponse toResponse(Treatment treatment) {
        return new TreatmentResponse(treatment.getId(), treatment.getName(), treatment.getCategory(), treatment.getDescription(),
                treatment.getDurationMinutes(), treatment.getPrice(), treatment.isActive(), treatment.getBranchId());
    }

    public record TreatmentRequest(@NotBlank String name, String category, String description,
            @Min(1) Integer durationMinutes, @DecimalMin(value = "0.0") BigDecimal price, Long branchId, Boolean active) { }

    public record TreatmentResponse(Long id, String name, String category, String description,
            Integer durationMinutes, BigDecimal price, boolean active, Long branchId) { }

    public record ErrorResponse(String message) { }
}
