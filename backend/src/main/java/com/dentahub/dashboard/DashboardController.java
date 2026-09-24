package com.dentahub.dashboard;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestHeader;

import com.dentahub.appointment.AppointmentRepository;
import com.dentahub.branch.BranchRepository;
import com.dentahub.doctor.DoctorRepository;
import com.dentahub.patient.PatientRepository;
import com.dentahub.auth.BranchAccessService;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final BranchRepository branchRepository;
    private final AppointmentRepository appointmentRepository;
    private final BranchAccessService accessService;

    public DashboardController(PatientRepository patientRepository, DoctorRepository doctorRepository, BranchRepository branchRepository, AppointmentRepository appointmentRepository, BranchAccessService accessService) {
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.branchRepository = branchRepository;
        this.appointmentRepository = appointmentRepository;
        this.accessService = accessService;
    }

    @GetMapping("/summary")
    public DashboardSummary summary(@RequestHeader(value = "Authorization", required = false) String authorization) {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();
        List<DashboardAppointment> appointments = appointmentRepository.findByAppointmentDateTimeBetweenOrderByAppointmentDateTimeAsc(start, end).stream()
                .filter(appointment -> doctorRepository.findById(appointment.getDoctorId()).map(doctor -> accessService.canAccess(authorization, doctor.getBranchId())).orElse(false))
                .map(appointment -> new DashboardAppointment(
                        appointment.getAppointmentDateTime(),
                        patientRepository.findById(appointment.getPatientId()).map(patient -> patient.getFullName()).orElse("Unknown patient"),
                        doctorRepository.findById(appointment.getDoctorId()).map(doctor -> doctor.getFullName()).orElse("Unknown doctor"),
                        appointment.getAppointmentType(),
                        appointment.getStatus()))
                .toList();

        long totalPatients = patientRepository.findAll().stream().filter(patient -> accessService.canAccess(authorization, patient.getBranchId())).count();
        long totalDoctors = doctorRepository.findAll().stream().filter(doctor -> accessService.canAccess(authorization, doctor.getBranchId())).count();
        long totalBranches = branchRepository.findAll().stream().filter(branch -> accessService.canAccess(authorization, branch.getId())).count();
        return new DashboardSummary(today, totalPatients, appointments.size(), totalDoctors, totalBranches, appointments);
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
