package com.dentahub.appointment;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findAllByOrderByAppointmentDateTimeAsc();
    List<Appointment> findByAppointmentDateTimeBetweenOrderByAppointmentDateTimeAsc(LocalDateTime start, LocalDateTime end);
    long countByAppointmentDateTimeBetween(LocalDateTime start, LocalDateTime end);
}
