package com.dentahub.settings;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

@RestController
@RequestMapping("/api/settings")
@Validated
public class ClinicSettingsController {

    private final ClinicSettingsRepository repository;

    public ClinicSettingsController(ClinicSettingsRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public SettingsResponse get() {
        return repository.findFirstByOrderByIdAsc().map(ClinicSettingsController::toResponse).orElseGet(SettingsResponse::empty);
    }

    @PutMapping
    public ResponseEntity<SettingsResponse> save(@Valid @RequestBody SettingsRequest request) {
        ClinicSettings settings = repository.findFirstByOrderByIdAsc().orElseGet(ClinicSettings::new);
        settings.setClinicName(request.clinicName().trim());
        settings.setPhone(blankToNull(request.phone()));
        settings.setEmail(blankToNull(request.email()));
        settings.setAddress(blankToNull(request.address()));
        settings.setCity(blankToNull(request.city()));
        settings.setState(blankToNull(request.state()));
        settings.setPostalCode(blankToNull(request.postalCode()));
        settings.setCurrency(blankToNull(request.currency()));
        settings.setTimezone(blankToNull(request.timezone()));
        settings.setAppointmentDurationMinutes(request.appointmentDurationMinutes());
        settings.setEmailNotificationsEnabled(Boolean.TRUE.equals(request.emailNotificationsEnabled()));
        settings.setEmailProvider(blankToNull(request.emailProvider()));
        settings.setSmtpHost(blankToNull(request.smtpHost()));
        settings.setSmtpPort(request.smtpPort());
        settings.setSmtpUsername(blankToNull(request.smtpUsername()));
        if (request.smtpPassword() != null && !request.smtpPassword().isBlank()) {
            settings.setSmtpPassword(request.smtpPassword().trim());
        }
        settings.setSmtpEncryption(blankToNull(request.smtpEncryption()));
        settings.setEmailFromName(blankToNull(request.emailFromName()));
        settings.setEmailFromAddress(blankToNull(request.emailFromAddress()));
        settings.setLogoDataUrl(blankToNull(request.logoDataUrl()));
        return ResponseEntity.ok(toResponse(repository.save(settings)));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static SettingsResponse toResponse(ClinicSettings settings) {
        return new SettingsResponse(settings.getId(), settings.getClinicName(), settings.getPhone(), settings.getEmail(), settings.getAddress(),
                settings.getCity(), settings.getState(), settings.getPostalCode(), settings.getCurrency(), settings.getTimezone(), settings.getAppointmentDurationMinutes(),
                settings.isEmailNotificationsEnabled(), settings.getEmailProvider(), settings.getSmtpHost(), settings.getSmtpPort(), settings.getSmtpUsername(),
                settings.getSmtpPassword() != null && !settings.getSmtpPassword().isBlank(), settings.getSmtpEncryption(), settings.getEmailFromName(), settings.getEmailFromAddress(), settings.getLogoDataUrl());
    }

    public record SettingsRequest(
            @NotBlank String clinicName,
            String phone,
            @Email String email,
            String address,
            String city,
            String state,
            String postalCode,
            String currency,
            String timezone,
            @Positive Integer appointmentDurationMinutes,
            Boolean emailNotificationsEnabled,
            String emailProvider,
            String smtpHost,
            @Positive Integer smtpPort,
            String smtpUsername,
            String smtpPassword,
            String smtpEncryption,
            String emailFromName,
            @Email String emailFromAddress,
            String logoDataUrl) {
    }

    public record SettingsResponse(
            Long id,
            String clinicName,
            String phone,
            String email,
            String address,
            String city,
            String state,
            String postalCode,
            String currency,
            String timezone,
            Integer appointmentDurationMinutes,
            boolean emailNotificationsEnabled,
            String emailProvider,
            String smtpHost,
            Integer smtpPort,
            String smtpUsername,
            boolean smtpPasswordConfigured,
            String smtpEncryption,
            String emailFromName,
            String emailFromAddress,
            String logoDataUrl) {
        static SettingsResponse empty() {
            return new SettingsResponse(null, "", null, null, null, null, null, null, null, null, null, false, null, null, null, null, false, null, null, null, null);
        }
    }
}
