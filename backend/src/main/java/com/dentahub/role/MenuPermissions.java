package com.dentahub.role;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public final class MenuPermissions {

    public static final List<String> ALL = List.of(
            "dashboard", "patients", "appointments", "doctors", "consultation", "dental-chart",
            "treatment-plans", "treatments", "billing", "payments", "users-roles", "branch", "settings");

    private MenuPermissions() { }

    public static String normalize(String permissions) {
        if (permissions == null || permissions.isBlank()) return "";
        return Arrays.stream(permissions.split(","))
                .map(String::trim)
                .map(String::toLowerCase)
                .filter(ALL::contains)
                .distinct()
                .collect(Collectors.joining(","));
    }

    public static List<String> asList(String permissions) {
        if (permissions == null || permissions.isBlank()) return List.of();
        return List.copyOf(Arrays.stream(normalize(permissions).split(",")).filter(value -> !value.isBlank()).toList());
    }
}
