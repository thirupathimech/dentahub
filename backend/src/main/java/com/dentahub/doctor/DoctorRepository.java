package com.dentahub.doctor;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    List<Doctor> findAllByOrderByCreatedAtDesc();
    List<Doctor> findByFullNameContainingIgnoreCaseOrSpecializationContainingIgnoreCaseOrPhoneContainingIgnoreCaseOrderByCreatedAtDesc(
            String fullName, String specialization, String phone);
}
