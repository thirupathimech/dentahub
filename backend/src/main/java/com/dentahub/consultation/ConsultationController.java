package com.dentahub.consultation;

import java.time.LocalDateTime;
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
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.auth.BranchAccessService;
import com.dentahub.doctor.Doctor;
import com.dentahub.doctor.DoctorRepository;
import com.dentahub.patient.PatientRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/consultations")
@Validated
public class ConsultationController {

    private final ConsultationRepository repository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final BranchAccessService accessService;

    public ConsultationController(ConsultationRepository repository, PatientRepository patientRepository, DoctorRepository doctorRepository, BranchAccessService accessService) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.accessService = accessService;
    }

    @GetMapping
    public List<ConsultationResponse> list(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return repository.findAllByOrderByConsultationDateTimeDesc().stream()
                .filter(consultation -> accessService.canAccess(authorization, consultation.getBranchId()))
                .map(this::toResponse).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authorization, @Valid @RequestBody ConsultationRequest request) {
        Doctor doctor = doctorRepository.findById(request.doctorId()).orElse(null);
        ResponseEntity<?> validation = validate(request, doctor, authorization);
        if (validation != null) return validation;
        Consultation consultation = new Consultation();
        apply(consultation, request, doctor.getBranchId());
        return ResponseEntity.ok(toResponse(repository.save(consultation)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String authorization, @Valid @RequestBody ConsultationRequest request) {
        Doctor doctor = doctorRepository.findById(request.doctorId()).orElse(null);
        ResponseEntity<?> validation = validate(request, doctor, authorization);
        if (validation != null) return validation;
        return repository.findById(id)
                .filter(consultation -> accessService.canAccess(authorization, consultation.getBranchId()))
                .map(consultation -> {
                    apply(consultation, request, doctor.getBranchId());
                    return ResponseEntity.ok(toResponse(repository.save(consultation)));
                }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String authorization) {
        Consultation consultation = repository.findById(id).orElse(null);
        if (consultation == null) return ResponseEntity.notFound().build();
        if (!accessService.canAccess(authorization, consultation.getBranchId())) return ResponseEntity.status(403).body(new ErrorResponse("You can only manage consultations in your assigned branch"));
        repository.delete(consultation);
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<?> validate(ConsultationRequest request, Doctor doctor, String authorization) {
        var patient = patientRepository.findById(request.patientId()).orElse(null);
        if (patient == null) return ResponseEntity.badRequest().body(new ErrorResponse("Selected patient was not found"));
        if (!accessService.canAccess(authorization, patient.getBranchId())) return ResponseEntity.status(403).body(new ErrorResponse("You can only work with patients in your assigned branch"));
        if (doctor == null) return ResponseEntity.badRequest().body(new ErrorResponse("Selected doctor was not found"));
        if (doctor.getBranchId() == null || !accessService.canAccess(authorization, doctor.getBranchId())) return ResponseEntity.status(403).body(new ErrorResponse("You can only work with consultations in your assigned branch"));
        return null;
    }

    private static void apply(Consultation consultation, ConsultationRequest request, Long branchId) {
        consultation.setPatientId(request.patientId());
        consultation.setDoctorId(request.doctorId());
        consultation.setBranchId(branchId);
        consultation.setConsultationDateTime(request.consultationDateTime());
        consultation.setChiefComplaint(blankToNull(request.chiefComplaint()));
        consultation.setDiagnosis(blankToNull(request.diagnosis()));
        consultation.setClinicalFindings(blankToNull(request.clinicalFindings()));
        consultation.setTreatmentPlan(blankToNull(request.treatmentPlan()));
        consultation.setNotes(blankToNull(request.notes()));
        consultation.setStatus(request.status() == null || request.status().isBlank() ? "IN_PROGRESS" : request.status().toUpperCase());
    }

    private ConsultationResponse toResponse(Consultation consultation) {
        String patientName = patientRepository.findById(consultation.getPatientId()).map(patient -> patient.getFullName()).orElse("Unknown patient");
        String doctorName = doctorRepository.findById(consultation.getDoctorId()).map(doctor -> doctor.getFullName()).orElse("Unknown doctor");
        return new ConsultationResponse(consultation.getId(), consultation.getPatientId(), patientName, consultation.getDoctorId(), doctorName,
                consultation.getBranchId(), consultation.getConsultationDateTime(), consultation.getChiefComplaint(), consultation.getDiagnosis(),
                consultation.getClinicalFindings(), consultation.getTreatmentPlan(), consultation.getNotes(), consultation.getStatus());
    }

    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    public record ConsultationRequest(@NotNull Long patientId, @NotNull Long doctorId, @NotNull LocalDateTime consultationDateTime,
            String chiefComplaint, String diagnosis, String clinicalFindings, String treatmentPlan, String notes, String status) { }

    public record ConsultationResponse(Long id, Long patientId, String patientName, Long doctorId, String doctorName, Long branchId,
            LocalDateTime consultationDateTime, String chiefComplaint, String diagnosis, String clinicalFindings, String treatmentPlan,
            String notes, String status) { }

    public record ErrorResponse(String message) { }
}
