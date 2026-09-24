package com.dentahub.payment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.auth.BranchAccessService;
import com.dentahub.billing.BillingInvoice;
import com.dentahub.billing.BillingInvoiceRepository;
import com.dentahub.patient.Patient;
import com.dentahub.patient.PatientRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/payments")
@Validated
public class PaymentController {

    private final PaymentRepository repository;
    private final BillingInvoiceRepository invoiceRepository;
    private final PatientRepository patientRepository;
    private final BranchAccessService accessService;

    public PaymentController(PaymentRepository repository, BillingInvoiceRepository invoiceRepository,
            PatientRepository patientRepository, BranchAccessService accessService) {
        this.repository = repository;
        this.invoiceRepository = invoiceRepository;
        this.patientRepository = patientRepository;
        this.accessService = accessService;
    }

    @GetMapping
    public List<PaymentResponse> list(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return repository.findAllByOrderByPaymentDateDescCreatedAtDesc().stream()
                .filter(payment -> accessService.canAccess(authorization, payment.getBranchId()))
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody PaymentRequest request) {
        BillingInvoice invoice = invoiceRepository.findById(request.invoiceId()).orElse(null);
        if (invoice == null) return ResponseEntity.badRequest().body(new ErrorResponse("Selected invoice was not found"));
        if (!accessService.canAccess(authorization, invoice.getBranchId())) {
            return ResponseEntity.status(403).body(new ErrorResponse("You can only record payments in your assigned branch"));
        }
        BigDecimal total = invoiceTotal(invoice);
        BigDecimal paid = repository.findByInvoiceId(invoice.getId()).stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal balance = total.subtract(paid).max(BigDecimal.ZERO);
        if (request.amount().compareTo(balance) > 0) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Payment cannot be greater than the invoice balance of " + balance));
        }

        Payment payment = new Payment();
        payment.setReceiptNumber(nextReceiptNumber());
        payment.setInvoiceId(invoice.getId());
        payment.setPatientId(invoice.getPatientId());
        payment.setBranchId(invoice.getBranchId());
        payment.setPaymentDate(request.paymentDate() == null ? LocalDate.now() : request.paymentDate());
        payment.setAmount(request.amount());
        payment.setMethod(request.method() == null || request.method().isBlank() ? "CASH" : request.method().toUpperCase());
        payment.setReference(blankToNull(request.reference()));
        payment.setNotes(blankToNull(request.notes()));
        Payment saved = repository.save(payment);
        updateInvoiceStatus(invoice, paid.add(saved.getAmount()), total);
        invoiceRepository.save(invoice);
        return ResponseEntity.ok(toResponse(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Payment payment = repository.findById(id).orElse(null);
        if (payment == null) return ResponseEntity.notFound().build();
        if (!accessService.canAccess(authorization, payment.getBranchId())) {
            return ResponseEntity.status(403).body(new ErrorResponse("You can only manage payments in your assigned branch"));
        }
        repository.delete(payment);
        repository.flush();
        invoiceRepository.findById(payment.getInvoiceId()).ifPresent(invoice -> {
            BigDecimal total = invoiceTotal(invoice);
            BigDecimal paid = repository.findByInvoiceId(invoice.getId()).stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            updateInvoiceStatus(invoice, paid, total);
            invoiceRepository.save(invoice);
        });
        return ResponseEntity.noContent().build();
    }

    private PaymentResponse toResponse(Payment payment) {
        String patientName = patientRepository.findById(payment.getPatientId()).map(Patient::getFullName).orElse("Unknown patient");
        String invoiceNumber = invoiceRepository.findById(payment.getInvoiceId()).map(BillingInvoice::getInvoiceNumber).orElse("Unknown invoice");
        return new PaymentResponse(payment.getId(), payment.getReceiptNumber(), payment.getInvoiceId(), invoiceNumber,
                payment.getPatientId(), patientName, payment.getBranchId(), payment.getPaymentDate(), payment.getAmount(),
                payment.getMethod(), payment.getReference(), payment.getNotes());
    }

    private static BigDecimal invoiceTotal(BillingInvoice invoice) {
        BigDecimal subtotal = invoice.getItems().stream()
                .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return subtotal.subtract(invoice.getDiscount() == null ? BigDecimal.ZERO : invoice.getDiscount())
                .add(invoice.getTax() == null ? BigDecimal.ZERO : invoice.getTax()).max(BigDecimal.ZERO);
    }

    private static void updateInvoiceStatus(BillingInvoice invoice, BigDecimal paid, BigDecimal total) {
        if (paid.compareTo(BigDecimal.ZERO) <= 0) {
            if (!"VOID".equals(invoice.getStatus())) invoice.setStatus("ISSUED");
            return;
        }
        invoice.setStatus(paid.compareTo(total) >= 0 ? "PAID" : "PARTIALLY_PAID");
    }

    private String nextReceiptNumber() {
        Payment latest = repository.findTopByOrderByIdDesc();
        long next = latest == null ? 1 : latest.getId() + 1;
        return String.format("PAY-%d-%05d", LocalDate.now().getYear(), next);
    }

    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    public record PaymentRequest(@NotNull Long invoiceId, LocalDate paymentDate,
            @NotNull @DecimalMin("0.01") BigDecimal amount, String method, String reference, String notes) { }

    public record PaymentResponse(Long id, String receiptNumber, Long invoiceId, String invoiceNumber, Long patientId,
            String patientName, Long branchId, LocalDate paymentDate, BigDecimal amount, String method, String reference, String notes) { }

    public record ErrorResponse(String message) { }
}
