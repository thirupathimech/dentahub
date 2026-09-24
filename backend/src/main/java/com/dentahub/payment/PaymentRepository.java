package com.dentahub.payment;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findAllByOrderByPaymentDateDescCreatedAtDesc();
    List<Payment> findByInvoiceId(Long invoiceId);
    Payment findTopByOrderByIdDesc();
}
