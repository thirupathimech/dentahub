package com.dentahub.settings;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "clinic_settings")
public class ClinicSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String clinicName = "";

    private String phone;
    private String email;
    private String address;
    private String city;
    private String state;
    private String postalCode;
    private String currency;
    private String timezone;
    private Integer appointmentDurationMinutes;

    @Column(columnDefinition = "MEDIUMTEXT")
    private String logoDataUrl;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void onSave() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getClinicName() { return clinicName; }
    public void setClinicName(String clinicName) { this.clinicName = clinicName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public Integer getAppointmentDurationMinutes() { return appointmentDurationMinutes; }
    public void setAppointmentDurationMinutes(Integer appointmentDurationMinutes) { this.appointmentDurationMinutes = appointmentDurationMinutes; }
    public String getLogoDataUrl() { return logoDataUrl; }
    public void setLogoDataUrl(String logoDataUrl) { this.logoDataUrl = logoDataUrl; }
    public Instant getUpdatedAt() { return updatedAt; }
}
