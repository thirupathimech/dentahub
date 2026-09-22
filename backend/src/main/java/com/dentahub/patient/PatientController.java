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

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;

@RestController
@RequestMapping("/api/patients")
@Validated
public class PatientController {

    private final PatientRepository repository;

    public PatientController(PatientRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<PatientResponse> list(@RequestParam(defaultValue = "") String q) {
        List<Patient> patients = q.isBlank()
                ? repository.findAllByOrderByCreatedAtDesc()
                : repository.findByFullNameContainingIgnoreCaseOrPhoneContainingIgnoreCaseOrEmailContainingIgnoreCaseOrderByCreatedAtDesc(q, q, q);
        return patients.stream().map(PatientController::toResponse).toList();
    }

    @PostMapping
    public PatientResponse create(@Valid @RequestBody PatientRequest request) {
        Patient patient = new Patient();
        apply(patient, request);
        return toResponse(repository.save(patient));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PatientResponse> update(@PathVariable Long id, @Valid @RequestBody PatientRequest request) {
        return repository.findById(id)
                .map(patient -> {
                    apply(patient, request);
                    return ResponseEntity.ok(toResponse(repository.save(patient)));
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

    private static void apply(Patient patient, PatientRequest request) {
        patient.setFullName(request.fullName().trim());
        patient.setPhone(request.phone().trim());
        patient.setEmail(blankToNull(request.email()));
        patient.setDateOfBirth(request.dateOfBirth());
        patient.setGender(blankToNull(request.gender()));
        patient.setAddress(blankToNull(request.address()));
        patient.setEmergencyContact(blankToNull(request.emergencyContact()));
        patient.setMedicalNotes(blankToNull(request.medicalNotes()));
        patient.setStatus(request.status() == null || request.status().isBlank() ? "ACTIVE" : request.status().toUpperCase());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static PatientResponse toResponse(Patient patient) {
        return new PatientResponse(patient.getId(), patient.getFullName(), patient.getPhone(), patient.getEmail(),
                patient.getDateOfBirth(), patient.getGender(), patient.getAddress(), patient.getEmergencyContact(),
                patient.getMedicalNotes(), patient.getStatus());
    }

    public record PatientRequest(
            @NotBlank String fullName,
            @NotBlank String phone,
            @Email String email,
            @Past LocalDate dateOfBirth,
            String gender,
            String address,
            String emergencyContact,
            String medicalNotes,
            String status) {
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
            String status) {
    }
}
