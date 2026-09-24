package com.dentahub.doctor;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestHeader;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import com.dentahub.auth.BranchAccessService;
import com.dentahub.branch.BranchRepository;

@RestController
@RequestMapping("/api/doctors")
@Validated
public class DoctorController {

    private final DoctorRepository repository;
    private final BranchRepository branchRepository;
    private final BranchAccessService accessService;

    public DoctorController(DoctorRepository repository, BranchRepository branchRepository, BranchAccessService accessService) {
        this.repository = repository;
        this.branchRepository = branchRepository;
        this.accessService = accessService;
    }

    @GetMapping
    public List<DoctorResponse> list(@RequestParam(defaultValue = "") String q, @RequestHeader(value = "Authorization", required = false) String authorization) {
        List<Doctor> doctors = q.isBlank()
                ? repository.findAllByOrderByCreatedAtDesc()
                : repository.findByFullNameContainingIgnoreCaseOrSpecializationContainingIgnoreCaseOrPhoneContainingIgnoreCaseOrderByCreatedAtDesc(q, q, q);
        return doctors.stream().filter(doctor -> accessService.canAccess(authorization, doctor.getBranchId())).map(DoctorController::toResponse).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authorization, @Valid @RequestBody DoctorRequest request) {
        Long branchId = effectiveBranch(authorization, request.branchId());
        if (branchId != null && !branchRepository.existsById(branchId)) return ResponseEntity.badRequest().body(new ErrorResponse("Selected branch was not found"));
        Doctor doctor = new Doctor();
        apply(doctor, request, branchId);
        return ResponseEntity.ok(toResponse(repository.save(doctor)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String authorization, @Valid @RequestBody DoctorRequest request) {
        Long branchId = effectiveBranch(authorization, request.branchId());
        if (branchId != null && !branchRepository.existsById(branchId)) return ResponseEntity.badRequest().body(new ErrorResponse("Selected branch was not found"));
        return repository.findById(id)
                .filter(doctor -> accessService.canAccess(authorization, doctor.getBranchId()))
                .map(doctor -> {
                    apply(doctor, request, branchId);
                    return ResponseEntity.ok(toResponse(repository.save(doctor)));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (!repository.findById(id).map(doctor -> accessService.canAccess(authorization, doctor.getBranchId())).orElse(false)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private static void apply(Doctor doctor, DoctorRequest request, Long branchId) {
        doctor.setFullName(request.fullName().trim());
        doctor.setSpecialization(request.specialization().trim());
        doctor.setLicenseNumber(blankToNull(request.licenseNumber()));
        doctor.setPhone(blankToNull(request.phone()));
        doctor.setEmail(blankToNull(request.email()));
        doctor.setBranchId(branchId);
        doctor.setBio(blankToNull(request.bio()));
        doctor.setStatus(request.status() == null || request.status().isBlank() ? "ACTIVE" : request.status().toUpperCase());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static DoctorResponse toResponse(Doctor doctor) {
        return new DoctorResponse(doctor.getId(), doctor.getFullName(), doctor.getSpecialization(), doctor.getLicenseNumber(),
                doctor.getPhone(), doctor.getEmail(), doctor.getBranchId(), doctor.getBio(), doctor.getStatus());
    }

    public record DoctorRequest(
            @NotBlank String fullName,
            @NotBlank String specialization,
            String licenseNumber,
            String phone,
            @Email String email,
            Long branchId,
            String bio,
            String status) {
    }

    public record DoctorResponse(
            Long id,
            String fullName,
            String specialization,
            String licenseNumber,
            String phone,
            String email,
            Long branchId,
            String bio,
            String status) {
    }

    private Long effectiveBranch(String authorization, Long requestedBranchId) {
        return accessService.scopedBranch(authorization).orElse(requestedBranchId);
    }

    public record ErrorResponse(String message) { }
}
