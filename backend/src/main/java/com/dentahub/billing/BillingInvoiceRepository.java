package com.dentahub.billing;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BillingInvoiceRepository extends JpaRepository<BillingInvoice, Long> {
    List<BillingInvoice> findAllByOrderByCreatedAtDesc();
    BillingInvoice findTopByOrderByIdDesc();
}
