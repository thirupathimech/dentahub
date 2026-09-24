package com.dentahub.treatment;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TreatmentRepository extends JpaRepository<Treatment, Long> {
    List<Treatment> findAllByOrderByNameAsc();
    List<Treatment> findByNameContainingIgnoreCaseOrCategoryContainingIgnoreCaseOrderByNameAsc(String name, String category);
}
