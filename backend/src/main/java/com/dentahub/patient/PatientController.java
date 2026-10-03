package com.dentahub.patient;

import java.time.LocalDate;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.RequestHeader;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import com.dentahub.auth.BranchAccessService;

@RestController
@RequestMapping("/api/patients")
@Validated
public class PatientController {

    private final PatientRepository repository;
    private final BranchAccessService accessService;
    private final PasswordEncoder passwordEncoder;

    public PatientController(PatientRepository repository, BranchAccessService accessService, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.accessService = accessService;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<PatientResponse> list(@RequestParam(defaultValue = "") String q, @RequestHeader(value = "Authorization", required = false) String authorization) {
        List<Patient> patients = q.isBlank()
                ? repository.findAllByOrderByCreatedAtDesc()
                : repository.findByFullNameContainingIgnoreCaseOrPhoneContainingIgnoreCaseOrEmailContainingIgnoreCaseOrderByCreatedAtDesc(q, q, q);
        return patients.stream().filter(patient -> accessService.canAccess(authorization, patient.getBranchId())).map(PatientController::toResponse).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientResponse> get(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String authorization) {
        return repository.findById(id).filter(patient -> accessService.canAccess(authorization, patient.getBranchId()))
                .map(patient -> ResponseEntity.ok(toResponse(patient))).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public PatientResponse create(@RequestHeader(value = "Authorization", required = false) String authorization, @Valid @RequestBody PatientRequest request) {
        List<Patient> duplicates = findDuplicates(request, authorization, null);
        if (!duplicates.isEmpty()) {
            throw new DuplicatePatientException(duplicates.stream().map(PatientController::toResponse).toList());
        }
        Patient patient = new Patient();
        apply(patient, request);
        patient.setPasswordHash(passwordHash(request.password(), null));
        patient.setBranchId(accessService.scopedBranch(authorization).orElse(request.branchId()));
        return toResponse(repository.save(patient));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PatientResponse> update(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String authorization, @Valid @RequestBody PatientRequest request) {
        List<Patient> duplicates = findDuplicates(request, authorization, id);
        if (!duplicates.isEmpty()) {
            throw new DuplicatePatientException(duplicates.stream().map(PatientController::toResponse).toList());
        }
        return repository.findById(id)
                .filter(patient -> accessService.canAccess(authorization, patient.getBranchId()))
                .map(patient -> {
                    apply(patient, request);
                    patient.setPasswordHash(passwordHash(request.password(), patient.getPasswordHash()));
                    patient.setBranchId(accessService.scopedBranch(authorization).orElse(request.branchId() == null ? patient.getBranchId() : request.branchId()));
                    return ResponseEntity.ok(toResponse(repository.save(patient)));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private List<Patient> findDuplicates(PatientRequest request, String authorization, Long ignoredId) {
        String name = request.fullName().trim();
        String phone = normalizePhone(request.phone());
        String email = request.email() == null ? "" : request.email().trim().toLowerCase();
        return repository.findAll().stream()
                .filter(patient -> ignoredId == null || !patient.getId().equals(ignoredId))
                .filter(patient -> accessService.canAccess(authorization, patient.getBranchId()))
                .filter(patient -> normalizePhone(patient.getPhone()).equals(phone)
                        || (!email.isBlank() && email.equalsIgnoreCase(patient.getEmail() == null ? "" : patient.getEmail()))
                        || (patient.getFullName().equalsIgnoreCase(name) && request.dateOfBirth() != null
                                && request.dateOfBirth().equals(patient.getDateOfBirth())))
                .toList();
    }

    private static String normalizePhone(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (!repository.findById(id).map(patient -> accessService.canAccess(authorization, patient.getBranchId())).orElse(false)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private static void apply(Patient patient, PatientRequest request) {
        patient.setFullName(request.fullName().trim());
        patient.setPhone(request.phone().trim());
        patient.setEmail(blankToNull(request.email()));
        patient.setDateOfBirth(request.dateOfBirth());
        patient.setGender(blankToNull(request.gender()));
        patient.setAddress(blankToNull(request.address()));
        patient.setEmergencyContact(blankToNull(request.emergencyContact()));
        patient.setMedicalNotes(blankToNull(request.medicalNotes()));
        patient.setAllergies(blankToNull(request.allergies()));
        patient.setMedications(blankToNull(request.medications()));
        patient.setMedicalHistory(blankToNull(request.medicalHistory()));
        patient.setStatus(request.status() == null || request.status().isBlank() ? "ACTIVE" : request.status().toUpperCase());
    }

    private String passwordHash(String password, String currentHash) {
        return password == null || password.isBlank() ? currentHash : passwordEncoder.encode(password);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static PatientResponse toResponse(Patient patient) {
        return new PatientResponse(patient.getId(), patient.getFullName(), patient.getPhone(), patient.getEmail(),
                patient.getDateOfBirth(), patient.getGender(), patient.getAddress(), patient.getEmergencyContact(),
                patient.getMedicalNotes(), patient.getAllergies(), patient.getMedications(), patient.getMedicalHistory(), patient.getBranchId(), patient.getStatus(), patient.getPasswordHash() != null);
    }

    public record PatientRequest(
            @NotBlank String fullName,
            @NotBlank String phone,
            @Email String email,
            Long branchId,
            @Past LocalDate dateOfBirth,
            String gender,
            String address,
            String emergencyContact,
            String medicalNotes,
            String allergies,
            String medications,
            String medicalHistory,
            String status,
            @Size(min = 6, message = "Patient login password must be at least 6 characters") String password) {
    }

    public record PatientResponse(
            Long id,
            String fullName,
            String phone,
            String email,
            LocalDate dateOfBirth,
            String gender,
            String address,
            String emergencyContact,
            String medicalNotes,
            String allergies,
            String medications,
            String medicalHistory,
            Long branchId,
            String status,
            boolean patientLoginEnabled) {
    }

    public static class DuplicatePatientException extends RuntimeException {
        private final List<PatientResponse> duplicates;

        public DuplicatePatientException(List<PatientResponse> duplicates) {
            super("A patient with the same phone, email, or name and date of birth already exists");
            this.duplicates = duplicates;
        }

        public List<PatientResponse> getDuplicates() { return duplicates; }
    }
}
