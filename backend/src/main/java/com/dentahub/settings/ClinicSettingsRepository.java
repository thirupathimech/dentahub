package com.dentahub.settings;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ClinicSettingsRepository extends JpaRepository<ClinicSettings, Long> {
    Optional<ClinicSettings> findFirstByOrderByIdAsc();
}
