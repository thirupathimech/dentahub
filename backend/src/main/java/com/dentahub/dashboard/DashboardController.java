package com.dentahub.dashboard;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

import com.dentahub.appointment.AppointmentRepository;
import com.dentahub.branch.BranchRepository;
import com.dentahub.doctor.DoctorRepository;
import com.dentahub.patient.PatientRepository;
import com.dentahub.auth.BranchAccessService;
import com.dentahub.billing.BillingInvoiceRepository;
import com.dentahub.payment.Payment;
import com.dentahub.payment.PaymentRepository;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final BranchRepository branchRepository;
    private final AppointmentRepository appointmentRepository;
    private final BranchAccessService accessService;
    private final BillingInvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    public DashboardController(PatientRepository patientRepository, DoctorRepository doctorRepository, BranchRepository branchRepository, AppointmentRepository appointmentRepository, BranchAccessService accessService, BillingInvoiceRepository invoiceRepository, PaymentRepository paymentRepository) {
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.branchRepository = branchRepository;
        this.appointmentRepository = appointmentRepository;
        this.accessService = accessService;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
    }

    @GetMapping("/summary")
    public DashboardSummary summary(@RequestParam(required = false) Long branchId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long selectedBranch = accessService.scopedBranch(authorization).orElse(branchId);
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        List<com.dentahub.appointment.Appointment> accessibleAppointments = appointmentRepository.findAllByOrderByAppointmentDateTimeAsc().stream()
                .filter(appointment -> doctorRepository.findById(appointment.getDoctorId()).map(doctor -> accessService.canAccess(authorization, doctor.getBranchId()) && matchesBranch(doctor.getBranchId(), selectedBranch)).orElse(false))
                .toList();
        List<DashboardAppointment> appointments = accessibleAppointments.stream()
                .filter(appointment -> !appointment.getAppointmentDateTime().isBefore(now))
                .limit(10)
                .map(appointment -> new DashboardAppointment(
                        appointment.getAppointmentDateTime(),
                        patientRepository.findById(appointment.getPatientId()).map(patient -> patient.getFullName()).orElse("Unknown patient"),
                        doctorRepository.findById(appointment.getDoctorId()).map(doctor -> doctor.getFullName()).orElse("Unknown doctor"),
                        appointment.getAppointmentType(),
                        appointment.getStatus()))
                .toList();

        long totalPatients = patientRepository.findAll().stream().filter(patient -> accessService.canAccess(authorization, patient.getBranchId()) && matchesBranch(patient.getBranchId(), selectedBranch)).count();
        long totalDoctors = doctorRepository.findAll().stream().filter(doctor -> accessService.canAccess(authorization, doctor.getBranchId()) && matchesBranch(doctor.getBranchId(), selectedBranch)).count();
        long totalBranches = branchRepository.findAll().stream().filter(branch -> accessService.canAccess(authorization, branch.getId()) && matchesBranch(branch.getId(), selectedBranch)).count();
        var branchInvoices = invoiceRepository.findAllByOrderByCreatedAtDesc().stream().filter(invoice -> accessService.canAccess(authorization, invoice.getBranchId()) && matchesBranch(invoice.getBranchId(), selectedBranch) && !"VOID".equalsIgnoreCase(invoice.getStatus())).toList();
        BigDecimal billed = branchInvoices.stream().map(DashboardController::invoiceTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal collected = branchInvoices.stream().flatMap(invoice -> paymentRepository.findByInvoiceId(invoice.getId()).stream()).map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal outstanding = branchInvoices.stream().map(invoice -> invoiceTotal(invoice).subtract(paymentRepository.findByInvoiceId(invoice.getId()).stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add)).max(BigDecimal.ZERO)).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new DashboardSummary(today, selectedBranch, totalPatients, accessibleAppointments.size(), totalDoctors, totalBranches, billed, collected, outstanding, appointments);
    }

    private static boolean matchesBranch(Long actual, Long selected) { return selected == null || selected.equals(actual); }
    private static BigDecimal invoiceTotal(com.dentahub.billing.BillingInvoice invoice) {
        BigDecimal subtotal = invoice.getItems().stream().map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()))).reduce(BigDecimal.ZERO, BigDecimal::add);
        return subtotal.subtract(invoice.getDiscount() == null ? BigDecimal.ZERO : invoice.getDiscount()).add(invoice.getTax() == null ? BigDecimal.ZERO : invoice.getTax()).max(BigDecimal.ZERO);
    }

    public record DashboardSummary(
            LocalDate date,
            Long branchId,
            long totalPatients,
            int todayAppointments,
            long totalDoctors,
            long totalBranches,
            BigDecimal totalBilled,
            BigDecimal totalCollected,
            BigDecimal totalOutstanding,
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
