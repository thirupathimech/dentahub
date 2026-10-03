package com.dentahub.auth;

import java.util.Optional;

import org.springframework.stereotype.Service;

import com.dentahub.patient.Patient;
import com.dentahub.patient.PatientRepository;

/** Resolves the patient attached to the lightweight patient portal session. */
@Service
public class PatientAccessService {

    private static final String PREFIX = "dentahub-patient-session-";
    private final PatientRepository patientRepository;

    public PatientAccessService(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    public Optional<Patient> currentPatient(String authorization) {
        String token = bearerToken(authorization);
        if (token == null || !token.startsWith(PREFIX)) return Optional.empty();
        try {
            Long patientId = Long.valueOf(token.substring(PREFIX.length()));
            return patientRepository.findById(patientId)
                    .filter(patient -> "ACTIVE".equalsIgnoreCase(patient.getStatus()));
        } catch (NumberFormatException exception) {
            return Optional.empty();
        }
    }

    private static String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return null;
        String token = authorization.substring("Bearer ".length()).trim();
        return token.isBlank() ? null : token;
    }
}
