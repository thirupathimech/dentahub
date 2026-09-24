package com.dentahub.treatmentplan;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TreatmentPlanRepository extends JpaRepository<TreatmentPlan, Long> {
    List<TreatmentPlan> findAllByOrderByCreatedAtDesc();
}
