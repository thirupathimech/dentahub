package com.dentahub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;

import com.dentahub.branch.Branch;
import com.dentahub.branch.BranchRepository;

@SpringBootApplication
public class DentaHubApplication {

    public static void main(String[] args) {
        SpringApplication.run(DentaHubApplication.class, args);
    }

    @Bean
    CommandLineRunner seedDefaultBranch(BranchRepository branchRepository) {
        return args -> branchRepository.findByCodeIgnoreCase("MAIN")
                .orElseGet(() -> {
                    Branch branch = new Branch();
                    branch.setName("MAIN BRANCH");
                    branch.setCode("MAIN");
                    branch.setActive(true);
                    return branchRepository.save(branch);
                });
    }
}
