package com.dentahub.patient;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientAttachmentRepository extends JpaRepository<PatientAttachment, Long> {
    List<PatientAttachment> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    Optional<PatientAttachment> findByIdAndPatientId(Long id, Long patientId);
}
