package com.dentahub.patient;

import java.util.List;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.dentahub.auth.BranchAccessService;

@RestController
@RequestMapping("/api/patients/{patientId}/attachments")
public class PatientAttachmentController {
    private final PatientAttachmentRepository repository;
    private final PatientRepository patients;
    private final BranchAccessService access;

    public PatientAttachmentController(PatientAttachmentRepository repository, PatientRepository patients, BranchAccessService access) {
        this.repository = repository; this.patients = patients; this.access = access;
    }

    @GetMapping
    public ResponseEntity<?> list(@PathVariable Long patientId, @RequestHeader(value = "Authorization", required = false) String authorization) {
        Patient patient = accessiblePatient(patientId, authorization); if (patient == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(repository.findByPatientIdOrderByCreatedAtDesc(patientId).stream().map(this::toResponse).toList());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@PathVariable Long patientId, @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestPart("file") MultipartFile file) throws java.io.IOException {
        Patient patient = accessiblePatient(patientId, authorization); if (patient == null) return ResponseEntity.notFound().build();
        if (file.isEmpty() || file.getSize() > 15 * 1024 * 1024) return ResponseEntity.badRequest().body(new ErrorResponse("File is empty or larger than 15 MB"));
        PatientAttachment attachment = new PatientAttachment(); attachment.setPatientId(patientId); attachment.setBranchId(patient.getBranchId());
        attachment.setFileName(file.getOriginalFilename() == null ? "document" : file.getOriginalFilename());
        attachment.setContentType(file.getContentType() == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : file.getContentType());
        attachment.setFileSize(file.getSize()); attachment.setContent(file.getBytes());
        return ResponseEntity.ok(toResponse(repository.save(attachment)));
    }

    @GetMapping("/{attachmentId}")
    public ResponseEntity<?> download(@PathVariable Long patientId, @PathVariable Long attachmentId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (accessiblePatient(patientId, authorization) == null) return ResponseEntity.notFound().build();
        PatientAttachment attachment = repository.findByIdAndPatientId(attachmentId, patientId).orElse(null); if (attachment == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(attachment.getContentType())).contentLength(attachment.getFileSize())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(attachment.getFileName()).build().toString())
                .body(new ByteArrayResource(attachment.getContent()));
    }

    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<?> delete(@PathVariable Long patientId, @PathVariable Long attachmentId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (accessiblePatient(patientId, authorization) == null) return ResponseEntity.notFound().build();
        PatientAttachment attachment = repository.findByIdAndPatientId(attachmentId, patientId).orElse(null); if (attachment == null) return ResponseEntity.notFound().build();
        repository.delete(attachment); return ResponseEntity.noContent().build();
    }

    private Patient accessiblePatient(Long id, String authorization) { return patients.findById(id).filter(patient -> access.canAccess(authorization, patient.getBranchId())).orElse(null); }
    private AttachmentResponse toResponse(PatientAttachment item) { return new AttachmentResponse(item.getId(), item.getFileName(), item.getContentType(), item.getFileSize(), item.getCreatedAt()); }
    public record AttachmentResponse(Long id, String fileName, String contentType, long fileSize, java.time.Instant createdAt) { }
    public record ErrorResponse(String message) { }
}
