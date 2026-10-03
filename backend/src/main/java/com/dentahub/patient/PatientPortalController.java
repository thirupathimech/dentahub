package com.dentahub.patient;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.appointment.Appointment;
import com.dentahub.appointment.AppointmentRepository;
import com.dentahub.auth.PatientAccessService;
import com.dentahub.doctor.Doctor;
import com.dentahub.doctor.DoctorRepository;

@RestController
@RequestMapping("/api/patient-portal")
@Validated
public class PatientPortalController {

    private final PatientAccessService accessService;
    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;

    public PatientPortalController(PatientAccessService accessService, AppointmentRepository appointmentRepository, DoctorRepository doctorRepository) {
        this.accessService = accessService;
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        var patient = accessService.currentPatient(authorization).orElse(null);
        if (patient == null) return unauthorized();
        return ResponseEntity.ok(new PatientProfile(patient.getId(), patient.getFullName(), patient.getEmail(), patient.getPhone()));
    }

    @GetMapping("/doctors")
    public ResponseEntity<?> doctors(@RequestHeader(value = "Authorization", required = false) String authorization) {
        if (accessService.currentPatient(authorization).isEmpty()) return unauthorized();
        List<DoctorOption> doctors = doctorRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(doctor -> "ACTIVE".equalsIgnoreCase(doctor.getStatus()))
                .map(doctor -> new DoctorOption(doctor.getId(), doctor.getFullName(), doctor.getSpecialization(), doctor.getBranchId()))
                .toList();
        return ResponseEntity.ok(doctors);
    }

    @GetMapping("/appointments")
    public ResponseEntity<?> appointments(@RequestHeader(value = "Authorization", required = false) String authorization) {
        var patient = accessService.currentPatient(authorization).orElse(null);
        if (patient == null) return unauthorized();
        List<AppointmentResponse> appointments = appointmentRepository.findAllByOrderByAppointmentDateTimeAsc().stream()
                .filter(appointment -> appointment.getPatientId().equals(patient.getId()))
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(appointments);
    }

    private AppointmentResponse toResponse(Appointment appointment) {
        Doctor doctor = doctorRepository.findById(appointment.getDoctorId()).orElse(null);
        LocalDateTime end = appointment.getAppointmentEndDateTime() == null
                ? appointment.getAppointmentDateTime().plusMinutes(30)
                : appointment.getAppointmentEndDateTime();
        return new AppointmentResponse(appointment.getId(), appointment.getPatientId(), doctor == null ? "Unknown doctor" : doctor.getFullName(),
                appointment.getDoctorId(), doctor == null ? "" : doctor.getSpecialization(), appointment.getAppointmentDateTime(), end,
                appointment.getAppointmentType(), appointment.getStatus(), appointment.getNotes());
    }

    private static ResponseEntity<ErrorResponse> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse("Your patient session has expired. Please sign in again."));
    }

    public record PatientProfile(Long id, String fullName, String email, String phone) { }
    public record DoctorOption(Long id, String fullName, String specialization, Long branchId) { }
    public record AppointmentResponse(Long id, Long patientId, String doctorName, Long doctorId, String specialization,
            LocalDateTime appointmentDateTime, LocalDateTime appointmentEndDateTime, String appointmentType, String status, String notes) { }
    public record ErrorResponse(String message) { }
}
