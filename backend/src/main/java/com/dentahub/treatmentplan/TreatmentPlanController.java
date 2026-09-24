package com.dentahub.treatmentplan;

import java.math.BigDecimal;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.auth.BranchAccessService;
import com.dentahub.doctor.Doctor;
import com.dentahub.doctor.DoctorRepository;
import com.dentahub.patient.Patient;
import com.dentahub.patient.PatientRepository;
import com.dentahub.treatment.Treatment;
import com.dentahub.treatment.TreatmentRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/treatment-plans")
@Validated
public class TreatmentPlanController {

    private final TreatmentPlanRepository repository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final TreatmentRepository treatmentRepository;
    private final BranchAccessService accessService;

    public TreatmentPlanController(TreatmentPlanRepository repository, PatientRepository patientRepository,
            DoctorRepository doctorRepository, TreatmentRepository treatmentRepository, BranchAccessService accessService) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.treatmentRepository = treatmentRepository;
        this.accessService = accessService;
    }

    @GetMapping
    public List<TreatmentPlanResponse> list(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .filter(plan -> accessService.canAccess(authorization, plan.getBranchId()))
                .map(this::toResponse).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody TreatmentPlanRequest request) {
        ValidationResult validation = validateRequest(authorization, request);
        if (validation.error() != null) return validation.error();
        TreatmentPlan plan = new TreatmentPlan();
        apply(plan, request, validation.patient(), validation.doctor());
        replaceItems(plan, request.treatments());
        return ResponseEntity.ok(toResponse(repository.save(plan)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody TreatmentPlanRequest request) {
        ValidationResult validation = validateRequest(authorization, request);
        if (validation.error() != null) return validation.error();
        return repository.findById(id)
                .filter(plan -> accessService.canAccess(authorization, plan.getBranchId()))
                .map(plan -> {
                    apply(plan, request, validation.patient(), validation.doctor());
                    replaceItems(plan, request.treatments());
                    return ResponseEntity.ok(toResponse(repository.save(plan)));
                }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        TreatmentPlan plan = repository.findById(id).orElse(null);
        if (plan == null) return ResponseEntity.notFound().build();
        if (!accessService.canAccess(authorization, plan.getBranchId())) {
            return ResponseEntity.status(403).body(new ErrorResponse("You can only manage plans in your assigned branch"));
        }
        repository.delete(plan);
        return ResponseEntity.noContent().build();
    }

    private ValidationResult validateRequest(String authorization, TreatmentPlanRequest request) {
        Patient patient = patientRepository.findById(request.patientId()).orElse(null);
        if (patient == null) return new ValidationResult(null, null,
                ResponseEntity.badRequest().body(new ErrorResponse("Selected patient was not found")));
        if (!accessService.canAccess(authorization, patient.getBranchId())) {
            return new ValidationResult(null, null,
                    ResponseEntity.status(403).body(new ErrorResponse("You can only work with patients in your assigned branch")));
        }

        Doctor doctor = null;
        if (request.doctorId() != null) {
            doctor = doctorRepository.findById(request.doctorId()).orElse(null);
            if (doctor == null) return new ValidationResult(null, null,
                    ResponseEntity.badRequest().body(new ErrorResponse("Selected doctor was not found")));
            if (doctor.getBranchId() != null && !accessService.canAccess(authorization, doctor.getBranchId())) {
                return new ValidationResult(null, null,
                        ResponseEntity.status(403).body(new ErrorResponse("You can only work with doctors in your assigned branch")));
            }
        }

        for (PlanTreatmentRequest item : safeItems(request.treatments())) {
            if (item.treatmentId() == null || item.quantity() == null || item.quantity() < 1) {
                return new ValidationResult(null, null,
                        ResponseEntity.badRequest().body(new ErrorResponse("Each plan treatment needs a valid treatment and quantity")));
            }
            Treatment treatment = treatmentRepository.findById(item.treatmentId()).orElse(null);
            if (treatment == null) return new ValidationResult(null, null,
                    ResponseEntity.badRequest().body(new ErrorResponse("Selected treatment was not found")));
            if (!accessService.canAccess(authorization, treatment.getBranchId())) {
                return new ValidationResult(null, null,
                        ResponseEntity.status(403).body(new ErrorResponse("You can only use treatments from your assigned branch")));
            }
        }
        return new ValidationResult(patient, doctor, null);
    }

    private static void apply(TreatmentPlan plan, TreatmentPlanRequest request, Patient patient, Doctor doctor) {
        plan.setPatientId(patient.getId());
        plan.setDoctorId(doctor == null ? null : doctor.getId());
        plan.setBranchId(patient.getBranchId());
        plan.setTitle(request.title().trim());
        plan.setDiagnosis(blankToNull(request.diagnosis()));
        plan.setStatus(request.status() == null || request.status().isBlank() ? "DRAFT" : request.status().toUpperCase());
        plan.setStartDate(request.startDate());
        plan.setTargetDate(request.targetDate());
        plan.setNotes(blankToNull(request.notes()));
    }

    private void replaceItems(TreatmentPlan plan, List<PlanTreatmentRequest> requestedItems) {
        plan.getItems().clear();
        for (PlanTreatmentRequest requested : safeItems(requestedItems)) {
            Treatment treatment = treatmentRepository.findById(requested.treatmentId()).orElseThrow();
            TreatmentPlanItem item = new TreatmentPlanItem();
            item.setPlan(plan);
            item.setTreatmentId(treatment.getId());
            item.setTreatmentName(treatment.getName());
            item.setQuantity(requested.quantity());
            item.setUnitPrice(treatment.getPrice() == null ? BigDecimal.ZERO : treatment.getPrice());
            plan.getItems().add(item);
        }
    }

    private TreatmentPlanResponse toResponse(TreatmentPlan plan) {
        String patientName = patientRepository.findById(plan.getPatientId()).map(Patient::getFullName).orElse("Unknown patient");
        String doctorName = plan.getDoctorId() == null ? null : doctorRepository.findById(plan.getDoctorId()).map(Doctor::getFullName).orElse("Unknown doctor");
        List<TreatmentPlanItemResponse> items = plan.getItems().stream()
                .map(item -> new TreatmentPlanItemResponse(item.getId(), item.getTreatmentId(), item.getTreatmentName(), item.getQuantity(),
                        item.getUnitPrice() == null ? BigDecimal.ZERO : item.getUnitPrice()))
                .toList();
        BigDecimal total = items.stream().map(item -> item.unitPrice().multiply(BigDecimal.valueOf(item.quantity()))).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new TreatmentPlanResponse(plan.getId(), plan.getPatientId(), patientName, plan.getDoctorId(), doctorName, plan.getBranchId(),
                plan.getTitle(), plan.getDiagnosis(), plan.getStatus(), plan.getStartDate(), plan.getTargetDate(), plan.getNotes(), items, total);
    }

    private static List<PlanTreatmentRequest> safeItems(List<PlanTreatmentRequest> items) { return items == null ? List.of() : items; }
    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private record ValidationResult(Patient patient, Doctor doctor, ResponseEntity<?> error) { }

    public record TreatmentPlanRequest(@NotNull Long patientId, Long doctorId, @NotBlank String title, String diagnosis,
            String status, LocalDate startDate, LocalDate targetDate, String notes, List<@Valid PlanTreatmentRequest> treatments) { }

    public record PlanTreatmentRequest(@NotNull Long treatmentId, @NotNull @Min(1) Integer quantity) { }

    public record TreatmentPlanResponse(Long id, Long patientId, String patientName, Long doctorId, String doctorName, Long branchId,
            String title, String diagnosis, String status, LocalDate startDate, LocalDate targetDate, String notes,
            List<TreatmentPlanItemResponse> treatments, BigDecimal estimatedTotal) { }

    public record TreatmentPlanItemResponse(Long id, Long treatmentId, String treatmentName, Integer quantity, BigDecimal unitPrice) { }

    public record ErrorResponse(String message) { }
}
