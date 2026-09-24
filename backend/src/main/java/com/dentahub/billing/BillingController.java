package com.dentahub.billing;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.auth.BranchAccessService;
import com.dentahub.patient.Patient;
import com.dentahub.patient.PatientRepository;
import com.dentahub.payment.Payment;
import com.dentahub.payment.PaymentRepository;
import com.dentahub.treatmentplan.TreatmentPlan;
import com.dentahub.treatmentplan.TreatmentPlanRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/billing/invoices")
@Validated
public class BillingController {

    private final BillingInvoiceRepository repository;
    private final PatientRepository patientRepository;
    private final TreatmentPlanRepository treatmentPlanRepository;
    private final PaymentRepository paymentRepository;
    private final BranchAccessService accessService;

    public BillingController(BillingInvoiceRepository repository, PatientRepository patientRepository,
            TreatmentPlanRepository treatmentPlanRepository, PaymentRepository paymentRepository,
            BranchAccessService accessService) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.treatmentPlanRepository = treatmentPlanRepository;
        this.paymentRepository = paymentRepository;
        this.accessService = accessService;
    }

    @GetMapping
    public List<InvoiceResponse> list(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .filter(invoice -> accessService.canAccess(authorization, invoice.getBranchId()))
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody InvoiceRequest request) {
        ValidationResult validation = validate(request, authorization);
        if (validation.error() != null) return validation.error();
        BillingInvoice invoice = new BillingInvoice();
        invoice.setInvoiceNumber(nextInvoiceNumber());
        apply(invoice, request, validation.patient());
        replaceItems(invoice, request.items());
        return ResponseEntity.ok(toResponse(repository.save(invoice)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody InvoiceRequest request) {
        ValidationResult validation = validate(request, authorization);
        if (validation.error() != null) return validation.error();
        return repository.findById(id)
                .filter(invoice -> accessService.canAccess(authorization, invoice.getBranchId()))
                .map(invoice -> {
                    apply(invoice, request, validation.patient());
                    replaceItems(invoice, request.items());
                    syncPaidStatus(invoice);
                    return ResponseEntity.ok(toResponse(repository.save(invoice)));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        BillingInvoice invoice = repository.findById(id).orElse(null);
        if (invoice == null) return ResponseEntity.notFound().build();
        if (!accessService.canAccess(authorization, invoice.getBranchId())) {
            return ResponseEntity.status(403).body(new ErrorResponse("You can only manage invoices in your assigned branch"));
        }
        if (!paymentRepository.findByInvoiceId(id).isEmpty()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Paid invoices cannot be deleted. Void the invoice instead."));
        }
        repository.delete(invoice);
        return ResponseEntity.noContent().build();
    }

    private ValidationResult validate(InvoiceRequest request, String authorization) {
        Patient patient = patientRepository.findById(request.patientId()).orElse(null);
        if (patient == null) return new ValidationResult(null, ResponseEntity.badRequest().body(new ErrorResponse("Selected patient was not found")));
        if (!accessService.canAccess(authorization, patient.getBranchId())) {
            return new ValidationResult(null, ResponseEntity.status(403).body(new ErrorResponse("You can only bill patients in your assigned branch")));
        }
        if (request.discount().compareTo(BigDecimal.ZERO) < 0 || request.tax().compareTo(BigDecimal.ZERO) < 0) {
            return new ValidationResult(null, ResponseEntity.badRequest().body(new ErrorResponse("Discount and tax cannot be negative")));
        }
        if (request.treatmentPlanId() != null) {
            TreatmentPlan plan = treatmentPlanRepository.findById(request.treatmentPlanId()).orElse(null);
            if (plan == null) return new ValidationResult(null, ResponseEntity.badRequest().body(new ErrorResponse("Selected treatment plan was not found")));
            if (!plan.getPatientId().equals(patient.getId()) || !accessService.canAccess(authorization, plan.getBranchId())) {
                return new ValidationResult(null, ResponseEntity.badRequest().body(new ErrorResponse("The selected treatment plan does not belong to this patient")));
            }
        }
        if (request.items() == null || request.items().isEmpty()) {
            return new ValidationResult(null, ResponseEntity.badRequest().body(new ErrorResponse("Add at least one invoice item")));
        }
        for (InvoiceItemRequest item : request.items()) {
            if (item.description() == null || item.description().isBlank() || item.quantity() == null || item.quantity() < 1
                    || item.unitPrice() == null || item.unitPrice().compareTo(BigDecimal.ZERO) < 0) {
                return new ValidationResult(null, ResponseEntity.badRequest().body(new ErrorResponse("Each invoice item needs a description, quantity and valid price")));
            }
        }
        return new ValidationResult(patient, null);
    }

    private static void apply(BillingInvoice invoice, InvoiceRequest request, Patient patient) {
        invoice.setPatientId(patient.getId());
        invoice.setBranchId(patient.getBranchId());
        invoice.setTreatmentPlanId(request.treatmentPlanId());
        invoice.setIssueDate(request.issueDate() == null ? LocalDate.now() : request.issueDate());
        invoice.setDueDate(request.dueDate());
        invoice.setStatus(request.status() == null || request.status().isBlank() ? "ISSUED" : request.status().toUpperCase());
        invoice.setDiscount(request.discount() == null ? BigDecimal.ZERO : request.discount());
        invoice.setTax(request.tax() == null ? BigDecimal.ZERO : request.tax());
        invoice.setNotes(blankToNull(request.notes()));
    }

    private static void replaceItems(BillingInvoice invoice, List<InvoiceItemRequest> requestedItems) {
        invoice.getItems().clear();
        for (InvoiceItemRequest requested : requestedItems) {
            BillingInvoiceItem item = new BillingInvoiceItem();
            item.setInvoice(invoice);
            item.setDescription(requested.description().trim());
            item.setQuantity(requested.quantity());
            item.setUnitPrice(requested.unitPrice());
            invoice.getItems().add(item);
        }
    }

    private InvoiceResponse toResponse(BillingInvoice invoice) {
        String patientName = patientRepository.findById(invoice.getPatientId()).map(Patient::getFullName).orElse("Unknown patient");
        List<InvoiceItemResponse> items = invoice.getItems().stream()
                .map(item -> new InvoiceItemResponse(item.getId(), item.getDescription(), item.getQuantity(), item.getUnitPrice()))
                .toList();
        BigDecimal subtotal = items.stream().map(item -> item.unitPrice().multiply(BigDecimal.valueOf(item.quantity()))).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal total = subtotal.subtract(invoice.getDiscount() == null ? BigDecimal.ZERO : invoice.getDiscount())
                .add(invoice.getTax() == null ? BigDecimal.ZERO : invoice.getTax()).max(BigDecimal.ZERO);
        BigDecimal paid = paymentRepository.findByInvoiceId(invoice.getId()).stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal balance = total.subtract(paid).max(BigDecimal.ZERO);
        return new InvoiceResponse(invoice.getId(), invoice.getInvoiceNumber(), invoice.getPatientId(), patientName, invoice.getBranchId(),
                invoice.getTreatmentPlanId(), invoice.getIssueDate(), invoice.getDueDate(), invoice.getStatus(), invoice.getDiscount(), invoice.getTax(),
                invoice.getNotes(), items, subtotal, total, paid, balance);
    }

    private void syncPaidStatus(BillingInvoice invoice) {
        BigDecimal paid = paymentRepository.findByInvoiceId(invoice.getId()).stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (paid.compareTo(BigDecimal.ZERO) <= 0) return;
        BigDecimal subtotal = invoice.getItems().stream()
                .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal total = subtotal.subtract(invoice.getDiscount()).add(invoice.getTax()).max(BigDecimal.ZERO);
        invoice.setStatus(paid.compareTo(total) >= 0 ? "PAID" : "PARTIALLY_PAID");
    }

    private String nextInvoiceNumber() {
        long next = repository.findTopByOrderByIdDesc() == null ? 1 : repository.findTopByOrderByIdDesc().getId() + 1;
        return String.format("INV-%d-%05d", LocalDate.now().getYear(), next);
    }

    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private record ValidationResult(Patient patient, ResponseEntity<?> error) { }

    public record InvoiceRequest(@NotNull Long patientId, Long treatmentPlanId, LocalDate issueDate, LocalDate dueDate,
            String status, @DecimalMin("0.00") BigDecimal discount, @DecimalMin("0.00") BigDecimal tax, String notes,
            List<@Valid InvoiceItemRequest> items) {
        public InvoiceRequest {
            discount = discount == null ? BigDecimal.ZERO : discount;
            tax = tax == null ? BigDecimal.ZERO : tax;
        }
    }

    public record InvoiceItemRequest(@NotBlank String description, @NotNull @Min(1) Integer quantity,
            @NotNull @DecimalMin("0.00") BigDecimal unitPrice) { }

    public record InvoiceResponse(Long id, String invoiceNumber, Long patientId, String patientName, Long branchId,
            Long treatmentPlanId, LocalDate issueDate, LocalDate dueDate, String status, BigDecimal discount, BigDecimal tax,
            String notes, List<InvoiceItemResponse> items, BigDecimal subtotal, BigDecimal total, BigDecimal paidAmount, BigDecimal balance) { }

    public record InvoiceItemResponse(Long id, String description, Integer quantity, BigDecimal unitPrice) { }

    public record ErrorResponse(String message) { }
}
