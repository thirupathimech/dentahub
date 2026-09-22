package com.dentahub.dashboard;

import java.time.LocalDate;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @GetMapping("/summary")
    public DashboardSummary summary() {
        return new DashboardSummary(
                LocalDate.now(),
                1284,
                32,
                18,
                12450.00,
                List.of(
                        new Appointment("09:00 AM", "Dr. Priya Nair", "Sarah Johnson", "Routine Checkup", "confirmed"),
                        new Appointment("10:30 AM", "Dr. Arun Kumar", "Michael Chen", "Root Canal Consultation", "in-progress"),
                        new Appointment("12:00 PM", "Dr. Priya Nair", "Emily Williams", "Teeth Whitening", "upcoming"),
                        new Appointment("02:30 PM", "Dr. Rahul Menon", "David Miller", "Dental Implant Review", "upcoming")
                ));
    }

    public record DashboardSummary(
            LocalDate date,
            int totalPatients,
            int todayAppointments,
            int activeTreatments,
            double todayRevenue,
            List<Appointment> appointments) {
    }

    public record Appointment(
            String time,
            String doctor,
            String patient,
            String treatment,
            String status) {
    }
}
