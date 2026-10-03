package com.dentahub.patient;

import java.time.LocalDateTime;
import java.math.BigDecimal;
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
import com.dentahub.billing.BillingInvoice;
import com.dentahub.billing.BillingInvoiceRepository;
import com.dentahub.doctor.Doctor;
import com.dentahub.doctor.DoctorRepository;
import com.dentahub.payment.Payment;
import com.dentahub.payment.PaymentRepository;

@RestController
@RequestMapping("/api/patient-portal")
@Validated
public class PatientPortalController {

    private final PatientAccessService accessService;
    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final BillingInvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    public PatientPortalController(PatientAccessService accessService, AppointmentRepository appointmentRepository, DoctorRepository doctorRepository,
            BillingInvoiceRepository invoiceRepository, PaymentRepository paymentRepository) {
        this.accessService = accessService;
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
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

    @GetMapping("/invoices")
    public ResponseEntity<?> invoices(@RequestHeader(value = "Authorization", required = false) String authorization) {
        var patient = accessService.currentPatient(authorization).orElse(null);
        if (patient == null) return unauthorized();
        List<InvoiceResponse> invoices = invoiceRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(invoice -> patient.getId().equals(invoice.getPatientId()) && !"VOID".equalsIgnoreCase(invoice.getStatus()))
                .map(invoice -> toInvoiceResponse(invoice, patient))
                .toList();
        return ResponseEntity.ok(invoices);
    }

    @GetMapping("/payments")
    public ResponseEntity<?> payments(@RequestHeader(value = "Authorization", required = false) String authorization) {
        var patient = accessService.currentPatient(authorization).orElse(null);
        if (patient == null) return unauthorized();
        List<PaymentResponse> payments = paymentRepository.findAllByOrderByPaymentDateDescCreatedAtDesc().stream()
                .filter(payment -> patient.getId().equals(payment.getPatientId()))
                .map(payment -> toPaymentResponse(payment, patient))
                .toList();
        return ResponseEntity.ok(payments);
    }

    private InvoiceResponse toInvoiceResponse(BillingInvoice invoice, Patient patient) {
        List<InvoiceItemResponse> items = invoice.getItems().stream()
                .map(item -> new InvoiceItemResponse(item.getId(), item.getDescription(), item.getQuantity(), item.getUnitPrice()))
                .toList();
        BigDecimal subtotal = items.stream().map(item -> item.unitPrice().multiply(BigDecimal.valueOf(item.quantity()))).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal total = subtotal.subtract(invoice.getDiscount() == null ? BigDecimal.ZERO : invoice.getDiscount())
                .add(invoice.getTax() == null ? BigDecimal.ZERO : invoice.getTax()).max(BigDecimal.ZERO);
        BigDecimal paid = paymentRepository.findByInvoiceId(invoice.getId()).stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new InvoiceResponse(invoice.getId(), invoice.getInvoiceNumber(), invoice.getPatientId(), patient.getFullName(), invoice.getBranchId(),
                invoice.getTreatmentPlanId(), invoice.getIssueDate(), invoice.getDueDate(), invoice.getStatus(), invoice.getDiscount(), invoice.getTax(),
                invoice.getNotes(), items, subtotal, total, paid, total.subtract(paid).max(BigDecimal.ZERO));
    }

    private PaymentResponse toPaymentResponse(Payment payment, Patient patient) {
        String invoiceNumber = invoiceRepository.findById(payment.getInvoiceId()).map(BillingInvoice::getInvoiceNumber).orElse("Unknown invoice");
        return new PaymentResponse(payment.getId(), payment.getReceiptNumber(), payment.getInvoiceId(), invoiceNumber, payment.getPatientId(), patient.getFullName(),
                payment.getBranchId(), payment.getPaymentDate(), payment.getAmount(), payment.getMethod(), payment.getReference(), payment.getNotes());
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
    public record InvoiceResponse(Long id, String invoiceNumber, Long patientId, String patientName, Long branchId, Long treatmentPlanId,
            java.time.LocalDate issueDate, java.time.LocalDate dueDate, String status, BigDecimal discount, BigDecimal tax, String notes,
            List<InvoiceItemResponse> items, BigDecimal subtotal, BigDecimal total, BigDecimal paidAmount, BigDecimal balance) { }
    public record InvoiceItemResponse(Long id, String description, Integer quantity, BigDecimal unitPrice) { }
    public record PaymentResponse(Long id, String receiptNumber, Long invoiceId, String invoiceNumber, Long patientId, String patientName, Long branchId,
            java.time.LocalDate paymentDate, BigDecimal amount, String method, String reference, String notes) { }
    public record ErrorResponse(String message) { }
}
