package com.dentahub.auth;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthSettingsRepository extends JpaRepository<AuthSettings, Long> {
}
