package com.dentahub.dashboard;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.appointment.AppointmentRepository;
import com.dentahub.branch.BranchRepository;
import com.dentahub.doctor.DoctorRepository;
import com.dentahub.patient.PatientRepository;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final BranchRepository branchRepository;
    private final AppointmentRepository appointmentRepository;

    public DashboardController(PatientRepository patientRepository, DoctorRepository doctorRepository, BranchRepository branchRepository, AppointmentRepository appointmentRepository) {
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.branchRepository = branchRepository;
        this.appointmentRepository = appointmentRepository;
    }

    @GetMapping("/summary")
    public DashboardSummary summary() {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();
        List<DashboardAppointment> appointments = appointmentRepository.findByAppointmentDateTimeBetweenOrderByAppointmentDateTimeAsc(start, end)
                .stream()
                .map(appointment -> new DashboardAppointment(
                        appointment.getAppointmentDateTime(),
                        patientRepository.findById(appointment.getPatientId()).map(patient -> patient.getFullName()).orElse("Unknown patient"),
                        doctorRepository.findById(appointment.getDoctorId()).map(doctor -> doctor.getFullName()).orElse("Unknown doctor"),
                        appointment.getAppointmentType(),
                        appointment.getStatus()))
                .toList();

        return new DashboardSummary(today, patientRepository.count(), appointments.size(), doctorRepository.count(), branchRepository.count(), appointments);
    }

    public record DashboardSummary(
            LocalDate date,
            long totalPatients,
            int todayAppointments,
            long totalDoctors,
            long totalBranches,
            List<DashboardAppointment> appointments) {
    }

    public record DashboardAppointment(
            LocalDateTime appointmentDateTime,
            String patient,
            String doctor,
            String appointmentType,
            String status) {
    }
}
