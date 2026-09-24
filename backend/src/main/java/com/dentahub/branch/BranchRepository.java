package com.dentahub.branch;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchRepository extends JpaRepository<Branch, Long> {
    List<Branch> findAllByOrderByNameAsc();
    Optional<Branch> findByCodeIgnoreCase(String code);
}
