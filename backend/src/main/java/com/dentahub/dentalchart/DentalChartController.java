package com.dentahub.dentalchart;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.auth.BranchAccessService;
import com.dentahub.patient.Patient;
import com.dentahub.patient.PatientRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/dental-charts")
@Validated
public class DentalChartController {
    private final DentalChartRepository repository;
    private final PatientRepository patientRepository;
    private final BranchAccessService accessService;
    private final ObjectMapper objectMapper;

    public DentalChartController(DentalChartRepository repository, PatientRepository patientRepository,
            BranchAccessService accessService, ObjectMapper objectMapper) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.accessService = accessService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/{patientId}")
    public ResponseEntity<?> get(@PathVariable Long patientId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Patient patient = patientRepository.findById(patientId).orElse(null);
        if (patient == null) return ResponseEntity.notFound().build();
        if (!accessService.canAccess(authorization, patient.getBranchId())) {
            return ResponseEntity.status(403).body(new ErrorResponse("You can only view patients in your assigned branch"));
        }
        return ResponseEntity.ok(toResponse(patient, repository.findByPatientId(patientId).orElse(null)));
    }

    @PutMapping("/{patientId}")
    public ResponseEntity<?> save(@PathVariable Long patientId,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody DentalChartRequest request) {
        Patient patient = patientRepository.findById(patientId).orElse(null);
        if (patient == null) return ResponseEntity.notFound().build();
        if (!accessService.canAccess(authorization, patient.getBranchId())) {
            return ResponseEntity.status(403).body(new ErrorResponse("You can only update patients in your assigned branch"));
        }
        DentalChart chart = repository.findByPatientId(patientId).orElseGet(DentalChart::new);
        chart.setPatientId(patientId);
        chart.setBranchId(patient.getBranchId());
        try {
            chart.setToothStatuses(objectMapper.writeValueAsString(request.toothStatuses() == null ? Map.of() : request.toothStatuses()));
        } catch (JsonProcessingException exception) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Tooth chart data could not be saved"));
        }
        chart.setNotes(blankToNull(request.notes()));
        return ResponseEntity.ok(toResponse(patient, repository.save(chart)));
    }

    private DentalChartResponse toResponse(Patient patient, DentalChart chart) {
        Map<String, String> statuses = new LinkedHashMap<>();
        if (chart != null && chart.getToothStatuses() != null && !chart.getToothStatuses().isBlank()) {
            try { statuses.putAll(objectMapper.readValue(chart.getToothStatuses(), new TypeReference<Map<String, String>>() { })); }
            catch (JsonProcessingException ignored) { statuses.clear(); }
        }
        return new DentalChartResponse(patient.getId(), patient.getFullName(), patient.getPhone(), patient.getDateOfBirth(),
                patient.getGender(), patient.getBranchId(), statuses, chart == null ? null : chart.getNotes(),
                chart == null ? null : chart.getUpdatedAt());
    }

    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    public record DentalChartRequest(Map<String, String> toothStatuses, String notes) { }
    public record DentalChartResponse(Long patientId, String patientName, String phone, java.time.LocalDate dateOfBirth,
            String gender, Long branchId, Map<String, String> toothStatuses, String notes, java.time.Instant updatedAt) { }
    public record ErrorResponse(String message) { }
}
