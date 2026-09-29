package com.dentahub.patient;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class PatientExceptionHandler {
    @ExceptionHandler(PatientController.DuplicatePatientException.class)
    public ResponseEntity<DuplicateResponse> duplicate(PatientController.DuplicatePatientException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new DuplicateResponse(exception.getMessage(), exception.getDuplicates()));
    }

    public record DuplicateResponse(String message, List<PatientController.PatientResponse> duplicates) { }
}
