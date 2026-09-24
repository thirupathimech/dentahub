package com.dentahub.auth;

import java.util.Optional;

import org.springframework.stereotype.Service;

import com.dentahub.role.Role;
import com.dentahub.role.RoleRepository;
import com.dentahub.user.UserAccount;
import com.dentahub.user.UserRepository;

/** Resolves the branch boundary attached to the current lightweight session token. */
@Service
public class BranchAccessService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public BranchAccessService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    public Optional<Long> scopedBranch(String authorization) {
        String token = bearerToken(authorization);
        if (token == null || "dentahub-demo-session".equals(token) || !token.startsWith("dentahub-user-session-")) return Optional.empty();
        try {
            Long userId = Long.valueOf(token.substring("dentahub-user-session-".length()));
            UserAccount user = userRepository.findById(userId).orElse(null);
            if (user == null || user.getRoleId() == null) return Optional.empty();
            Role role = roleRepository.findById(user.getRoleId()).orElse(null);
            return role != null && role.isBranchScoped() && role.getBranchId() != null ? Optional.of(role.getBranchId()) : Optional.empty();
        } catch (NumberFormatException exception) {
            return Optional.empty();
        }
    }

    public boolean canAccess(String authorization, Long branchId) {
        return scopedBranch(authorization).map(scoped -> scoped.equals(branchId)).orElse(true);
    }

    private static String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return null;
        String token = authorization.substring("Bearer ".length()).trim();
        return token.isBlank() ? null : token;
    }
}
