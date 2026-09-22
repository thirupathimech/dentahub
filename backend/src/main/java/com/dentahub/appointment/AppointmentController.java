package com.dentahub.appointment;

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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.doctor.DoctorRepository;
import com.dentahub.patient.PatientRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/appointments")
@Validated
public class AppointmentController {

    private final AppointmentRepository repository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    public AppointmentController(AppointmentRepository repository, PatientRepository patientRepository, DoctorRepository doctorRepository) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
    }

    @GetMapping
    public List<AppointmentResponse> list() {
        return repository.findAllByOrderByAppointmentDateTimeAsc().stream().map(this::toResponse).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody AppointmentRequest request) {
        ResponseEntity<?> validation = validateReferences(request);
        if (validation != null) return validation;
        Appointment appointment = new Appointment();
        apply(appointment, request);
        return ResponseEntity.ok(toResponse(repository.save(appointment)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody AppointmentRequest request) {
        ResponseEntity<?> validation = validateReferences(request);
        if (validation != null) return validation;
        return repository.findById(id)
                .map(appointment -> {
                    apply(appointment, request);
                    return ResponseEntity.ok(toResponse(repository.save(appointment)));
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

    private ResponseEntity<?> validateReferences(AppointmentRequest request) {
        if (!patientRepository.existsById(request.patientId())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Selected patient was not found"));
        }
        if (!doctorRepository.existsById(request.doctorId())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Selected doctor was not found"));
        }
        return null;
    }

    private static void apply(Appointment appointment, AppointmentRequest request) {
        appointment.setPatientId(request.patientId());
        appointment.setDoctorId(request.doctorId());
        appointment.setAppointmentDateTime(request.appointmentDateTime());
        appointment.setAppointmentType(request.appointmentType().trim());
        appointment.setStatus(request.status() == null || request.status().isBlank() ? "SCHEDULED" : request.status().toUpperCase());
        appointment.setNotes(request.notes() == null || request.notes().isBlank() ? null : request.notes().trim());
    }

    private AppointmentResponse toResponse(Appointment appointment) {
        String patientName = patientRepository.findById(appointment.getPatientId()).map(patient -> patient.getFullName()).orElse("Unknown patient");
        String doctorName = doctorRepository.findById(appointment.getDoctorId()).map(doctor -> doctor.getFullName()).orElse("Unknown doctor");
        return new AppointmentResponse(appointment.getId(), appointment.getPatientId(), patientName, appointment.getDoctorId(), doctorName,
                appointment.getAppointmentDateTime(), appointment.getAppointmentType(), appointment.getStatus(), appointment.getNotes());
    }

    public record AppointmentRequest(
            @NotNull Long patientId,
            @NotNull Long doctorId,
            @NotNull @FutureOrPresent LocalDateTime appointmentDateTime,
            @NotBlank String appointmentType,
            String status,
            String notes) {
    }

    public record AppointmentResponse(
            Long id,
            Long patientId,
            String patientName,
            Long doctorId,
            String doctorName,
            LocalDateTime appointmentDateTime,
            String appointmentType,
            String status,
            String notes) {
    }

    public record ErrorResponse(String message) {
    }
}
