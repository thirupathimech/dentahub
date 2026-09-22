package com.dentahub.patient;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    List<Patient> findAllByOrderByCreatedAtDesc();
    List<Patient> findByFullNameContainingIgnoreCaseOrPhoneContainingIgnoreCaseOrEmailContainingIgnoreCaseOrderByCreatedAtDesc(
            String fullName, String phone, String email);
}
