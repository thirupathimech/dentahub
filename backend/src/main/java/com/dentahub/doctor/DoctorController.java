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

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/doctors")
@Validated
public class DoctorController {

    private final DoctorRepository repository;

    public DoctorController(DoctorRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<DoctorResponse> list(@RequestParam(defaultValue = "") String q) {
        List<Doctor> doctors = q.isBlank()
                ? repository.findAllByOrderByCreatedAtDesc()
                : repository.findByFullNameContainingIgnoreCaseOrSpecializationContainingIgnoreCaseOrPhoneContainingIgnoreCaseOrderByCreatedAtDesc(q, q, q);
        return doctors.stream().map(DoctorController::toResponse).toList();
    }

    @PostMapping
    public DoctorResponse create(@Valid @RequestBody DoctorRequest request) {
        Doctor doctor = new Doctor();
        apply(doctor, request);
        return toResponse(repository.save(doctor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DoctorResponse> update(@PathVariable Long id, @Valid @RequestBody DoctorRequest request) {
        return repository.findById(id)
                .map(doctor -> {
                    apply(doctor, request);
                    return ResponseEntity.ok(toResponse(repository.save(doctor)));
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

    private static void apply(Doctor doctor, DoctorRequest request) {
        doctor.setFullName(request.fullName().trim());
        doctor.setSpecialization(request.specialization().trim());
        doctor.setLicenseNumber(blankToNull(request.licenseNumber()));
        doctor.setPhone(blankToNull(request.phone()));
        doctor.setEmail(blankToNull(request.email()));
        doctor.setBranchId(request.branchId());
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
}
