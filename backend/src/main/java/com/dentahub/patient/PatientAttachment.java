package com.dentahub.patient;

import java.time.Instant;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "patient_attachments")
public class PatientAttachment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private Long patientId;
    private Long branchId;
    @Column(nullable = false) private String fileName;
    @Column(nullable = false) private String contentType;
    @Column(nullable = false) private long fileSize;
    @Lob @Basic(fetch = FetchType.LAZY) @Column(nullable = false, columnDefinition = "LONGBLOB")
    private byte[] content;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @PrePersist void onCreate() { createdAt = Instant.now(); }
    public Long getId() { return id; }
    public Long getPatientId() { return patientId; } public void setPatientId(Long value) { patientId = value; }
    public Long getBranchId() { return branchId; } public void setBranchId(Long value) { branchId = value; }
    public String getFileName() { return fileName; } public void setFileName(String value) { fileName = value; }
    public String getContentType() { return contentType; } public void setContentType(String value) { contentType = value; }
    public long getFileSize() { return fileSize; } public void setFileSize(long value) { fileSize = value; }
    public byte[] getContent() { return content; } public void setContent(byte[] value) { content = value; }
    public Instant getCreatedAt() { return createdAt; }
}
