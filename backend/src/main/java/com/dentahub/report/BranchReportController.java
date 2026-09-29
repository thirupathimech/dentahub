package com.dentahub.report;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.auth.BranchAccessService;
import com.dentahub.billing.BillingInvoice;
import com.dentahub.billing.BillingInvoiceRepository;
import com.dentahub.payment.Payment;
import com.dentahub.payment.PaymentRepository;
import com.dentahub.patient.PatientRepository;
import com.dentahub.appointment.AppointmentRepository;
import com.dentahub.doctor.DoctorRepository;

@RestController
@RequestMapping("/api/reports/branch")
public class BranchReportController {
    private final BillingInvoiceRepository invoices;
    private final PaymentRepository payments;
    private final PatientRepository patients;
    private final AppointmentRepository appointments;
    private final DoctorRepository doctors;
    private final BranchAccessService access;

    public BranchReportController(BillingInvoiceRepository invoices, PaymentRepository payments, PatientRepository patients,
            AppointmentRepository appointments, DoctorRepository doctors, BranchAccessService access) {
        this.invoices = invoices; this.payments = payments; this.patients = patients; this.appointments = appointments; this.doctors = doctors; this.access = access;
    }

    @GetMapping
    public BranchReport report(@RequestParam Long branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (!access.canAccess(authorization, branchId)) return new BranchReport(branchId, 0, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        LocalDate start = from == null ? LocalDate.MIN : from; LocalDate end = to == null ? LocalDate.MAX : to;
        var branchInvoices = invoices.findAllByOrderByCreatedAtDesc().stream().filter(item -> branchId.equals(item.getBranchId()) && !item.getIssueDate().isBefore(start) && !item.getIssueDate().isAfter(end)).toList();
        BigDecimal billed = branchInvoices.stream().filter(item -> !"VOID".equals(item.getStatus())).map(this::total).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal collected = branchInvoices.stream().flatMap(item -> payments.findByInvoiceId(item.getId()).stream()).filter(item -> !item.getPaymentDate().isBefore(start) && !item.getPaymentDate().isAfter(end)).map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        long patientCount = patients.findAll().stream().filter(item -> branchId.equals(item.getBranchId())).count();
        long doctorCount = doctors.findAll().stream().filter(item -> branchId.equals(item.getBranchId())).count();
        long appointmentCount = appointments.findAll().stream().filter(item -> doctors.findById(item.getDoctorId()).map(doctor -> branchId.equals(doctor.getBranchId())).orElse(false)).filter(item -> !item.getAppointmentDateTime().toLocalDate().isBefore(start) && !item.getAppointmentDateTime().toLocalDate().isAfter(end)).count();
        return new BranchReport(branchId, patientCount, doctorCount, appointmentCount, billed, collected, billed.subtract(collected).max(BigDecimal.ZERO));
    }

    private BigDecimal total(BillingInvoice invoice) { return invoice.getItems().stream().map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()))).reduce(BigDecimal.ZERO, BigDecimal::add).subtract(invoice.getDiscount()).add(invoice.getTax()).max(BigDecimal.ZERO); }
    public record BranchReport(Long branchId, long patients, long doctors, long appointments, BigDecimal billed, BigDecimal collected, BigDecimal outstanding) { }
}
