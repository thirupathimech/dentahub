package com.dentahub.search;

import java.util.ArrayList;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.dentahub.auth.BranchAccessService;
import com.dentahub.appointment.Appointment;
import com.dentahub.appointment.AppointmentRepository;
import com.dentahub.billing.BillingInvoice;
import com.dentahub.billing.BillingInvoiceRepository;
import com.dentahub.doctor.Doctor;
import com.dentahub.doctor.DoctorRepository;
import com.dentahub.patient.Patient;
import com.dentahub.patient.PatientRepository;

@RestController
@RequestMapping("/api/search")
public class GlobalSearchController {
    private final PatientRepository patients;
    private final AppointmentRepository appointments;
    private final BillingInvoiceRepository invoices;
    private final DoctorRepository doctors;
    private final BranchAccessService access;

    public GlobalSearchController(PatientRepository patients, AppointmentRepository appointments,
            BillingInvoiceRepository invoices, DoctorRepository doctors, BranchAccessService access) {
        this.patients = patients; this.appointments = appointments; this.invoices = invoices; this.doctors = doctors; this.access = access;
    }

    @GetMapping
    public List<SearchResult> search(@RequestParam(defaultValue = "") String q,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        String query = q.trim().toLowerCase();
        if (query.isBlank()) return List.of();
        List<SearchResult> result = new ArrayList<>();
        patients.findAll().stream().filter(p -> access.canAccess(authorization, p.getBranchId()))
                .filter(p -> matches(query, p.getFullName(), p.getPhone(), p.getEmail()))
                .limit(8).forEach(p -> result.add(new SearchResult("PATIENT", p.getId(), p.getFullName(), p.getPhone(), "/patients?q=" + enc(p.getPhone()))));
        invoices.findAllByOrderByCreatedAtDesc().stream().filter(i -> access.canAccess(authorization, i.getBranchId()))
                .filter(i -> matches(query, i.getInvoiceNumber(), patientName(i.getPatientId()), i.getStatus()))
                .limit(8).forEach(i -> result.add(new SearchResult("INVOICE", i.getId(), i.getInvoiceNumber(), patientName(i.getPatientId()), "/billing")));
        appointments.findAllByOrderByAppointmentDateTimeAsc().stream()
                .filter(a -> doctors.findById(a.getDoctorId()).map(d -> access.canAccess(authorization, d.getBranchId())).orElse(false))
                .filter(a -> matches(query, patientName(a.getPatientId()), doctorName(a.getDoctorId()), a.getAppointmentType(), a.getStatus()))
                .limit(8).forEach(a -> result.add(new SearchResult("APPOINTMENT", a.getId(), patientName(a.getPatientId()), doctorName(a.getDoctorId()), "/appointments")));
        return result.stream().limit(20).toList();
    }

    private String patientName(Long id) { return patients.findById(id).map(Patient::getFullName).orElse(""); }
    private String doctorName(Long id) { return doctors.findById(id).map(Doctor::getFullName).orElse(""); }
    private static boolean matches(String q, String... values) { for (String value : values) if (value != null && value.toLowerCase().contains(q)) return true; return false; }
    private static String enc(String value) { return value == null ? "" : value.replace(" ", "%20"); }
    public record SearchResult(String type, Long id, String title, String subtitle, String path) { }
}
