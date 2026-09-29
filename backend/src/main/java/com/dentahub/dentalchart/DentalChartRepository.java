package com.dentahub.dentalchart;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DentalChartRepository extends JpaRepository<DentalChart, Long> {
    Optional<DentalChart> findByPatientId(Long patientId);
}
