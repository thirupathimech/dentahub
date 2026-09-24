package com.dentahub.appointment;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

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
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.RequestHeader;

import com.dentahub.doctor.DoctorRepository;
import com.dentahub.patient.PatientRepository;
import com.dentahub.auth.BranchAccessService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/appointments")
@Validated
public class AppointmentController {

    private static final LocalTime CLINIC_DAY_START = LocalTime.of(8, 0);
    private static final LocalTime CLINIC_DAY_END = LocalTime.of(20, 0);
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final AppointmentRepository repository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final BranchAccessService accessService;

    public AppointmentController(AppointmentRepository repository, PatientRepository patientRepository, DoctorRepository doctorRepository, BranchAccessService accessService) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.accessService = accessService;
    }

    @GetMapping
    public List<AppointmentResponse> list(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date, @RequestHeader(value = "Authorization", required = false) String authorization) {
        List<Appointment> appointments = date == null
                ? repository.findAllByOrderByAppointmentDateTimeAsc()
                : repository.findByAppointmentDateTimeGreaterThanEqualAndAppointmentDateTimeLessThanOrderByAppointmentDateTimeAsc(
                        date.atStartOfDay(), date.plusDays(1).atStartOfDay());
        return appointments.stream().filter(appointment -> doctorRepository.findById(appointment.getDoctorId()).map(doctor -> accessService.canAccess(authorization, doctor.getBranchId())).orElse(false)).map(this::toResponse).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authorization, @Valid @RequestBody AppointmentRequest request) {
        ResponseEntity<?> validation = validateReferences(request, authorization);
        if (validation != null) return validation;
        validation = validateTimeRange(request);
        if (validation != null) return validation;
        validation = validateConflicts(request, null);
        if (validation != null) return validation;
        Appointment appointment = new Appointment();
        apply(appointment, request);
        return ResponseEntity.ok(toResponse(repository.save(appointment)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String authorization, @Valid @RequestBody AppointmentRequest request) {
        ResponseEntity<?> validation = validateReferences(request, authorization);
        if (validation != null) return validation;
        validation = validateTimeRange(request);
        if (validation != null) return validation;
        validation = validateConflicts(request, id);
        if (validation != null) return validation;
        return repository.findById(id)
                .filter(appointment -> doctorRepository.findById(appointment.getDoctorId()).map(doctor -> accessService.canAccess(authorization, doctor.getBranchId())).orElse(false))
                .map(appointment -> {
                    apply(appointment, request);
                    return ResponseEntity.ok(toResponse(repository.save(appointment)));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        var appointment = repository.findById(id).orElse(null);
        var doctor = appointment == null ? null : doctorRepository.findById(appointment.getDoctorId()).orElse(null);
        if (doctor == null || !accessService.canAccess(authorization, doctor.getBranchId())) return ResponseEntity.status(403).body(new ErrorResponse("You can only manage appointments in your assigned branch"));
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<?> validateReferences(AppointmentRequest request, String authorization) {
        var patient = patientRepository.findById(request.patientId()).orElse(null);
        if (patient == null) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Selected patient was not found"));
        }
        if (!accessService.canAccess(authorization, patient.getBranchId())) return ResponseEntity.status(403).body(new ErrorResponse("You can only work with patients in your assigned branch"));
        var doctor = doctorRepository.findById(request.doctorId()).orElse(null);
        if (doctor == null) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Selected doctor was not found"));
        }
        if (!accessService.canAccess(authorization, doctor.getBranchId())) return ResponseEntity.status(403).body(new ErrorResponse("You can only work with appointments in your assigned branch"));
        return null;
    }

    private static ResponseEntity<?> validateTimeRange(AppointmentRequest request) {
        if (request.appointmentEndDateTime() == null || !request.appointmentEndDateTime().isAfter(request.appointmentDateTime())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("End time must be after start time"));
        }
        return null;
    }

    private ResponseEntity<?> validateConflicts(AppointmentRequest request, Long ignoredAppointmentId) {
        if (request.overrideConflict()) return null;

        List<Appointment> conflicts = findConflicts(request, ignoredAppointmentId);
        if (conflicts.isEmpty()) return null;

        List<ConflictAppointment> conflictDetails = conflicts.stream()
                .map(appointment -> toConflictAppointment(appointment, request))
                .toList();
        return ResponseEntity.status(409).body(new ConflictResponse(
                "This doctor or patient already has an appointment in the selected time.",
                conflictDetails,
                findAvailableSlots(request, ignoredAppointmentId)));
    }

    private List<Appointment> findConflicts(AppointmentRequest request, Long ignoredAppointmentId) {
        return repository.findAll().stream()
                .filter(appointment -> ignoredAppointmentId == null || !appointment.getId().equals(ignoredAppointmentId))
                .filter(appointment -> !List.of("CANCELLED", "NO_SHOW").contains(appointment.getStatus()))
                .filter(appointment -> appointment.getDoctorId().equals(request.doctorId()) || appointment.getPatientId().equals(request.patientId()))
                .filter(appointment -> overlaps(appointment.getAppointmentDateTime(), endDateTime(appointment), request.appointmentDateTime(), request.appointmentEndDateTime()))
                .collect(Collectors.toList());
    }

    private List<AvailableSlot> findAvailableSlots(AppointmentRequest request, Long ignoredAppointmentId) {
        long durationMinutes = java.time.Duration.between(request.appointmentDateTime(), request.appointmentEndDateTime()).toMinutes();
        LocalDateTime dayStart = request.appointmentDateTime().toLocalDate().atTime(CLINIC_DAY_START);
        LocalDateTime lastStart = request.appointmentDateTime().toLocalDate().atTime(CLINIC_DAY_END).minusMinutes(durationMinutes);
        List<AvailableSlot> slots = new ArrayList<>();

        for (LocalDateTime slotStart = dayStart; !slotStart.isAfter(lastStart) && slots.size() < 6; slotStart = slotStart.plusMinutes(30)) {
            LocalDateTime slotEnd = slotStart.plusMinutes(durationMinutes);
            AppointmentRequest slotRequest = new AppointmentRequest(request.patientId(), request.doctorId(), slotStart, slotEnd,
                    request.appointmentType(), request.status(), request.notes(), true);
            if (findConflicts(slotRequest, ignoredAppointmentId).isEmpty()) {
                slots.add(new AvailableSlot(slotStart.toLocalTime().format(TIME_FORMATTER), slotEnd.toLocalTime().format(TIME_FORMATTER)));
            }
        }
        return slots;
    }

    private ConflictAppointment toConflictAppointment(Appointment appointment, AppointmentRequest request) {
        boolean doctorConflict = appointment.getDoctorId().equals(request.doctorId());
        boolean patientConflict = appointment.getPatientId().equals(request.patientId());
        String reason = doctorConflict && patientConflict ? "Doctor and patient are both busy"
                : doctorConflict ? "Doctor is busy" : "Patient already has an appointment";
        return new ConflictAppointment(appointment.getId(), appointment.getPatientId(),
                patientRepository.findById(appointment.getPatientId()).map(patient -> patient.getFullName()).orElse("Unknown patient"),
                appointment.getDoctorId(), doctorRepository.findById(appointment.getDoctorId()).map(doctor -> doctor.getFullName()).orElse("Unknown doctor"),
                appointment.getAppointmentDateTime(), endDateTime(appointment), reason);
    }

    private static LocalDateTime endDateTime(Appointment appointment) {
        return appointment.getAppointmentEndDateTime() == null
                ? appointment.getAppointmentDateTime().plusMinutes(30)
                : appointment.getAppointmentEndDateTime();
    }

    private static boolean overlaps(LocalDateTime firstStart, LocalDateTime firstEnd, LocalDateTime secondStart, LocalDateTime secondEnd) {
        return firstStart.isBefore(secondEnd) && firstEnd.isAfter(secondStart);
    }

    private static void apply(Appointment appointment, AppointmentRequest request) {
        appointment.setPatientId(request.patientId());
        appointment.setDoctorId(request.doctorId());
        appointment.setAppointmentDateTime(request.appointmentDateTime());
        appointment.setAppointmentEndDateTime(request.appointmentEndDateTime());
        appointment.setAppointmentType(request.appointmentType().trim());
        appointment.setStatus(request.status() == null || request.status().isBlank() ? "SCHEDULED" : request.status().toUpperCase());
        appointment.setNotes(request.notes() == null || request.notes().isBlank() ? null : request.notes().trim());
    }

    private AppointmentResponse toResponse(Appointment appointment) {
        String patientName = patientRepository.findById(appointment.getPatientId()).map(patient -> patient.getFullName()).orElse("Unknown patient");
        String doctorName = doctorRepository.findById(appointment.getDoctorId()).map(doctor -> doctor.getFullName()).orElse("Unknown doctor");
        LocalDateTime endDateTime = appointment.getAppointmentEndDateTime() == null
                ? appointment.getAppointmentDateTime().plusMinutes(30)
                : appointment.getAppointmentEndDateTime();
        return new AppointmentResponse(appointment.getId(), appointment.getPatientId(), patientName, appointment.getDoctorId(), doctorName,
                appointment.getAppointmentDateTime(), endDateTime, appointment.getAppointmentType(), appointment.getStatus(), appointment.getNotes());
    }

    public record AppointmentRequest(
            @NotNull Long patientId,
            @NotNull Long doctorId,
            @NotNull LocalDateTime appointmentDateTime,
            @NotNull LocalDateTime appointmentEndDateTime,
            @NotBlank String appointmentType,
            String status,
            String notes,
            boolean overrideConflict) {
    }

    public record AppointmentResponse(
            Long id,
            Long patientId,
            String patientName,
            Long doctorId,
            String doctorName,
            LocalDateTime appointmentDateTime,
            LocalDateTime appointmentEndDateTime,
            String appointmentType,
            String status,
            String notes) {
    }

    public record ConflictResponse(String message, List<ConflictAppointment> conflicts, List<AvailableSlot> availableSlots) {
    }

    public record ConflictAppointment(Long id, Long patientId, String patientName, Long doctorId, String doctorName,
            LocalDateTime appointmentDateTime, LocalDateTime appointmentEndDateTime, String reason) {
    }

    public record AvailableSlot(String startTime, String endTime) {
    }

    public record ErrorResponse(String message) {
    }
}
